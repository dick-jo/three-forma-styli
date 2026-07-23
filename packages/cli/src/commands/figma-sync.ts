/**
 * Figma Sync Command
 *
 * Pushes generated design tokens directly to a Figma file via the Variables REST API.
 * Handles create-or-update: first GET to discover existing state, then POST to sync.
 *
 * Requires:
 * - FIGMA_TOKEN env var (personal access token with file_variables:write scope)
 * - A Figma file key
 *
 * Enterprise plan required for Variables API access.
 */

import chalk from 'chalk';
import {
	generateFigmaJson,
	type PartialDesignSystem,
	type FigmaCollection,
} from '@three-forma-styli/core';
import { loadConfigModule, resolveDesignSystemExport } from '../config/load-module.js';
import type { TfsProject } from '@three-forma-styli/compiler/project';

// ─── Figma API Types ──────────────────────────────────────────

interface FigmaApiVariable {
	id: string;
	name: string;
	variableCollectionId: string;
	resolvedType: string;
	valuesByMode: Record<string, unknown>;
	remote?: boolean;
}

interface FigmaApiCollection {
	id: string;
	name: string;
	modes: Array<{ modeId: string; name: string }>;
	defaultModeId: string;
	variableIds: string[];
	remote?: boolean;
	isExtension?: boolean;
}

interface FigmaGetResponse {
	status: number;
	error: boolean;
	meta: {
		variables: Record<string, FigmaApiVariable>;
		variableCollections: Record<string, FigmaApiCollection>;
	};
}

interface FigmaPostResponse {
	status: number;
	error: boolean;
	meta?: {
		tempIdToRealId: Record<string, string>;
	};
}

// ─── API Helpers ──────────────────────────────────────────────

const FIGMA_API = 'https://api.figma.com/v1';

async function figmaGet(fileKey: string, token: string): Promise<FigmaGetResponse> {
	const res = await fetch(`${FIGMA_API}/files/${fileKey}/variables/local`, {
		headers: { 'X-Figma-Token': token },
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Figma GET failed (${res.status}): ${text}`);
	}
	return res.json() as Promise<FigmaGetResponse>;
}

async function figmaPost(
	fileKey: string,
	token: string,
	payload: Record<string, unknown>
): Promise<FigmaPostResponse> {
	const body = JSON.stringify(payload);
	if (body.length > 4 * 1024 * 1024) {
		throw new Error(
			`Payload too large (${(body.length / 1024 / 1024).toFixed(1)}MB) — Figma limit is 4MB`
		);
	}

	const res = await fetch(`${FIGMA_API}/files/${fileKey}/variables`, {
		method: 'POST',
		headers: {
			'X-Figma-Token': token,
			'Content-Type': 'application/json',
		},
		body,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Figma POST failed (${res.status}): ${text}`);
	}
	return res.json() as Promise<FigmaPostResponse>;
}

// ─── Sync Logic ───────────────────────────────────────────────

export type FigmaSyncPolicy = 'merge' | 'authoritative';

export interface FigmaSyncPlan {
	payload: Record<string, unknown[]>;
	summary: {
		collections: { create: number; update: number; delete: number };
		modes: { create: number; update: number; delete: number };
		variables: { create: number; update: number; delete: number };
		values: number;
	};
	hasDeletions: boolean;
}

function actionCount(entries: Record<string, unknown>[], action: string): number {
	return entries.filter((entry) => entry.action === action).length;
}

function assertUnique(values: string[], subject: string): void {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			throw new Error(`Figma sync cannot disambiguate duplicate ${subject} "${value}"`);
		}
		seen.add(value);
	}
}

function tempId(kind: 'collection' | 'mode' | 'variable', index: number): string {
	return `temp_${kind}_${index}`;
}

/**
 * Build the Figma API payload to sync a collection of variables.
 *
 * Merge policy:
 * - If collection doesn't exist → CREATE collection + modes + variables + values
 * - If collection exists → UPDATE modes + variables + values (match by name)
 *
 * Authoritative policy additionally removes variables and non-default modes
 * that are absent from the TFS source. Callers must separately confirm the
 * resulting destructive plan before sending it.
 */
export function buildSyncPlan(
	collection: FigmaCollection,
	existing: FigmaGetResponse['meta'],
	policy: FigmaSyncPolicy = 'merge'
): FigmaSyncPlan {
	if (policy !== 'merge' && policy !== 'authoritative') {
		throw new Error(`Unknown Figma sync policy "${policy}"`);
	}
	if (collection.modes.length > 40) {
		throw new Error(
			`Figma collections support at most 40 modes (received ${collection.modes.length})`
		);
	}
	if (collection.variables.length > 5000) {
		throw new Error(
			`Figma collections support at most 5000 variables (received ${collection.variables.length})`
		);
	}
	if (!collection.modes.includes(collection.defaultMode)) {
		throw new Error(
			`Figma collection "${collection.name}" default mode "${collection.defaultMode}" is not present in its modes`
		);
	}
	assertUnique(collection.modes, 'source mode');
	assertUnique(
		collection.variables.map((variable) => variable.name),
		'source variable'
	);
	const sourceModes = new Set(collection.modes);
	for (const variable of collection.variables) {
		const valueModes = Object.keys(variable.values);
		const missingModes = collection.modes.filter((mode) => !valueModes.includes(mode));
		const unknownModes = valueModes.filter((mode) => !sourceModes.has(mode));
		if (missingModes.length > 0 || unknownModes.length > 0) {
			throw new Error(
				`Figma variable "${variable.name}" mode values do not match collection modes` +
					`${missingModes.length > 0 ? `; missing: ${missingModes.join(', ')}` : ''}` +
					`${unknownModes.length > 0 ? `; unknown: ${unknownModes.join(', ')}` : ''}`
			);
		}
	}

	const variableCollections: Record<string, unknown>[] = [];
	const variableModes: Record<string, unknown>[] = [];
	const variables: Record<string, unknown>[] = [];
	const variableModeValues: Record<string, unknown>[] = [];

	// Collection names are not guaranteed to be unique in Figma. Refuse to
	// choose an arbitrary target when the file is ambiguous.
	const matchingCollections = Object.values(existing.variableCollections).filter(
		(c) => c.name === collection.name
	);
	if (matchingCollections.length > 1) {
		throw new Error(
			`Figma file contains ${matchingCollections.length} collections named "${collection.name}"; rename them before syncing`
		);
	}
	const existingCollection = matchingCollections[0];
	if (existingCollection?.remote || existingCollection?.isExtension) {
		throw new Error(
			`Figma collection "${collection.name}" is remote or extended and cannot be mutated by TFS`
		);
	}
	if (existingCollection && policy === 'merge') {
		const mergedModeNames = new Set([
			...existingCollection.modes.map((mode) => mode.name),
			...collection.modes,
		]);
		if (mergedModeNames.size > 40) {
			throw new Error(
				`Merge would leave Figma collection "${collection.name}" with ${mergedModeNames.size} modes; the limit is 40. Use authoritative sync or remove stale modes.`
			);
		}
		const existingVariableNames = new Set(
			Object.values(existing.variables)
				.filter((variable) => variable.variableCollectionId === existingCollection.id)
				.map((variable) => variable.name)
		);
		const mergedVariableNames = new Set([
			...existingVariableNames,
			...collection.variables.map((variable) => variable.name),
		]);
		if (mergedVariableNames.size > 5000) {
			throw new Error(
				`Merge would leave Figma collection "${collection.name}" with ${mergedVariableNames.size} variables; the limit is 5000. Use authoritative sync or remove stale variables.`
			);
		}
	}

	let collectionId: string;
	const modeIdMap = new Map<string, string>(); // our mode name → figma mode ID
	let nextModeId = 0;
	let nextVariableId = 0;

	if (existingCollection) {
		// ── UPDATE existing collection ──
		collectionId = existingCollection.id;

		// Map existing modes by name
		assertUnique(
			existingCollection.modes.map((mode) => mode.name),
			`mode in Figma collection "${collection.name}"`
		);
		const existingModesByName = new Map(existingCollection.modes.map((m) => [m.name, m.modeId]));

		const currentDefaultMode = existingCollection.modes.find(
			(mode) => mode.modeId === existingCollection.defaultModeId
		);
		if (
			currentDefaultMode &&
			currentDefaultMode.name !== collection.defaultMode &&
			existingModesByName.has(collection.defaultMode)
		) {
			throw new Error(
				`Figma collection "${collection.name}" has default mode "${currentDefaultMode.name}", ` +
					`but TFS expects "${collection.defaultMode}". Align the default mode in Figma before syncing.`
			);
		}
		if (
			currentDefaultMode &&
			currentDefaultMode.name !== collection.defaultMode &&
			!existingModesByName.has(collection.defaultMode)
		) {
			variableModes.push({
				action: 'UPDATE',
				id: currentDefaultMode.modeId,
				name: collection.defaultMode,
				variableCollectionId: collectionId,
			});
			modeIdMap.set(collection.defaultMode, currentDefaultMode.modeId);
			existingModesByName.delete(currentDefaultMode.name);
		}

		for (const modeName of collection.modes) {
			if (modeIdMap.has(modeName)) continue;
			if (existingModesByName.has(modeName)) {
				modeIdMap.set(modeName, existingModesByName.get(modeName)!);
			} else {
				// New mode — create with temp ID
				const id = tempId('mode', nextModeId++);
				modeIdMap.set(modeName, id);
				variableModes.push({
					action: 'CREATE',
					id,
					name: modeName,
					variableCollectionId: collectionId,
				});
			}
		}
		if (policy === 'authoritative') {
			for (const mode of existingCollection.modes) {
				if (mode.modeId === existingCollection.defaultModeId || sourceModes.has(mode.name))
					continue;
				variableModes.push({
					action: 'DELETE',
					id: mode.modeId,
					variableCollectionId: collectionId,
				});
			}
		}
	} else {
		// ── CREATE new collection ──
		collectionId = tempId('collection', 0);
		const initialModeId = tempId('mode', nextModeId++);
		modeIdMap.set(collection.defaultMode, initialModeId);

		variableCollections.push({
			action: 'CREATE',
			id: collectionId,
			name: collection.name,
			initialModeId,
		});

		// Rename initial mode to our default mode name
		variableModes.push({
			action: 'UPDATE',
			id: initialModeId,
			name: collection.defaultMode,
			variableCollectionId: collectionId,
		});

		// Create additional modes
		for (const modeName of collection.modes) {
			if (modeName === collection.defaultMode) continue;
			const id = tempId('mode', nextModeId++);
			modeIdMap.set(modeName, id);
			variableModes.push({
				action: 'CREATE',
				id,
				name: modeName,
				variableCollectionId: collectionId,
			});
		}
	}

	// Build variable name → existing ID map
	const existingVarsByName = new Map<string, FigmaApiVariable>();
	if (existingCollection) {
		const collectionVariables = Object.values(existing.variables).filter(
			(variable) => variable.variableCollectionId === existingCollection.id
		);
		assertUnique(
			collectionVariables.map((variable) => variable.name),
			`variable in Figma collection "${collection.name}"`
		);
		for (const v of collectionVariables) {
			if (v.variableCollectionId === existingCollection.id) {
				existingVarsByName.set(v.name, v);
			}
		}
	}

	// Create or update variables and set mode values
	for (const variable of collection.variables) {
		const existingVariable = existingVarsByName.get(variable.name);
		let variableId: string;

		if (existingVariable) {
			if (existingVariable.remote) {
				throw new Error(`Figma variable "${variable.name}" is remote and cannot be mutated by TFS`);
			}
			if (existingVariable.resolvedType !== variable.type) {
				throw new Error(
					`Figma variable "${variable.name}" has type ${existingVariable.resolvedType}, ` +
						`but TFS requires ${variable.type}; Figma cannot update a variable's type in place`
				);
			}
			variableId = existingVariable.id;
			// Variable already exists — just update values (no need to UPDATE the variable itself
			// unless we want to change name/description)
		} else {
			variableId = tempId('variable', nextVariableId++);
			variables.push({
				action: 'CREATE',
				id: variableId,
				name: variable.name,
				resolvedType: variable.type,
				variableCollectionId: collectionId,
			});
		}

		// Set values for each mode
		for (const [modeName, modeValue] of Object.entries(variable.values)) {
			const modeId = modeIdMap.get(modeName);
			if (!modeId) continue;

			variableModeValues.push({
				variableId,
				modeId,
				value: modeValue.rgba,
			});
		}
	}
	if (existingCollection && policy === 'authoritative') {
		const sourceVariables = new Set(collection.variables.map((variable) => variable.name));
		for (const variable of existingVarsByName.values()) {
			if (sourceVariables.has(variable.name)) continue;
			if (variable.remote) {
				throw new Error(
					`Authoritative sync would need to delete remote Figma variable "${variable.name}"; remove it from the collection first`
				);
			}
			variables.push({ action: 'DELETE', id: variable.id });
		}
	}

	const payload = { variableCollections, variableModes, variables, variableModeValues };
	const summary = {
		collections: {
			create: actionCount(variableCollections, 'CREATE'),
			update: actionCount(variableCollections, 'UPDATE'),
			delete: actionCount(variableCollections, 'DELETE'),
		},
		modes: {
			create: actionCount(variableModes, 'CREATE'),
			update: actionCount(variableModes, 'UPDATE'),
			delete: actionCount(variableModes, 'DELETE'),
		},
		variables: {
			create: actionCount(variables, 'CREATE'),
			update: actionCount(variables, 'UPDATE'),
			delete: actionCount(variables, 'DELETE'),
		},
		values: variableModeValues.length,
	};
	return {
		payload,
		summary,
		hasDeletions: summary.collections.delete + summary.modes.delete + summary.variables.delete > 0,
	};
}

/** Backwards-compatible payload helper. Prefer buildSyncPlan for diagnostics. */
export function buildPayload(
	collection: FigmaCollection,
	existing: FigmaGetResponse['meta'],
	policy: FigmaSyncPolicy = 'merge'
): Record<string, unknown[]> {
	return buildSyncPlan(collection, existing, policy).payload;
}

// ─── Public Command ───────────────────────────────────────────

/**
 * Load a DesignSystem from a TypeScript theme file (same logic as build command)
 */
async function loadColorSystem(filePath: string): Promise<PartialDesignSystem> {
	const loaded = await loadConfigModule(filePath);
	console.log(chalk.cyan(`Loading design system from: ${loaded.inputPath}`));
	const possibleProject = loaded.module.default as Partial<TfsProject> | undefined;
	const designSystem =
		possibleProject?.kind === 'three-forma-styli/project'
			? possibleProject.system
			: resolveDesignSystemExport(loaded.module);
	if (!designSystem?.colors) {
		throw new Error('Figma sync requires a design system with colors');
	}
	// Figma sync is deliberately color-only. Do not leak a project typography
	// input (whose fonts are resolved by the full project compiler) into the core
	// PartialDesignSystem contract.
	return { colors: designSystem.colors };
}

export interface FigmaSyncOptions {
	fileKey: string;
	token?: string;
	dryRun?: boolean;
	collectionName?: string;
	colorSpace?: 'srgb' | 'display-p3';
	policy?: FigmaSyncPolicy;
	yes?: boolean;
}

export async function figmaSyncCommand(filePath: string, options: FigmaSyncOptions): Promise<void> {
	if (
		options.policy !== undefined &&
		options.policy !== 'merge' &&
		options.policy !== 'authoritative'
	) {
		throw new Error(`Unknown Figma sync policy "${String(options.policy)}"`);
	}
	const token = options.token || process.env.FIGMA_TOKEN;
	if (!options.dryRun && !token) {
		throw new Error(
			'No Figma token. Set FIGMA_TOKEN or pass --figma-token; required scopes are file_variables:read and file_variables:write.'
		);
	}

	// Load design system from theme file
	const designSystem = await loadColorSystem(filePath);

	// Generate profile-aware values. Display-P3 components are meaningful only
	// when the target Figma file itself uses the Display P3 profile.
	const jsonStr = generateFigmaJson(
		designSystem,
		{
			transformer: {
				collectionName: options.collectionName,
				colorSpace: options.colorSpace ?? 'srgb',
			},
		},
		'figma-variables'
	);

	const parsed = JSON.parse(jsonStr);
	const collection: FigmaCollection = parsed.collections[0];

	console.log(chalk.cyan(`Syncing "${collection.name}" to Figma...`));
	console.log(chalk.gray(`  Modes: ${collection.modes.join(', ')}`));
	console.log(chalk.gray(`  Variables: ${collection.variables.length}`));
	console.log(chalk.gray(`  Color space: ${options.colorSpace ?? 'srgb'}`));
	console.log(chalk.gray(`  Policy: ${options.policy ?? 'merge'}`));

	// A token-backed dry run is an exact remote diff. A tokenless dry run is
	// still useful, but explicitly previews creation against an empty file.
	let existing: FigmaGetResponse;
	if (token) {
		console.log(chalk.gray('  Fetching existing variables...'));
		existing = await figmaGet(options.fileKey, token);
	} else {
		console.log(
			chalk.yellow('  Tokenless dry run: previewing creation against an empty Figma file')
		);
		existing = {
			status: 200,
			error: false,
			meta: { variables: {}, variableCollections: {} },
		};
	}

	const existingCollection = Object.values(existing.meta.variableCollections).find(
		(c) => c.name === collection.name
	);

	if (existingCollection) {
		console.log(chalk.gray(`  Found existing collection "${collection.name}" — will update`));
	} else {
		console.log(chalk.gray(`  Collection "${collection.name}" not found — will create`));
	}

	// Step 2: Build, report, and optionally POST the plan
	const plan = buildSyncPlan(collection, existing.meta, options.policy);
	const { payload, summary } = plan;

	console.log(
		chalk.gray(
			`  Collections: +${summary.collections.create} ~${summary.collections.update} -${summary.collections.delete}; ` +
				`modes: +${summary.modes.create} ~${summary.modes.update} -${summary.modes.delete}; ` +
				`variables: +${summary.variables.create} ~${summary.variables.update} -${summary.variables.delete}; ` +
				`values: ${summary.values}`
		)
	);

	if (options.dryRun) {
		console.log(chalk.yellow('\n[DRY RUN] Would send this payload:\n'));
		console.log(JSON.stringify(payload, null, 2));
		return;
	}
	if (plan.hasDeletions && !options.yes) {
		throw new Error(
			'Authoritative Figma sync would delete modes or variables. Re-run with --yes after reviewing --dry-run.'
		);
	}

	const result = await figmaPost(options.fileKey, token!, payload);

	if (result.error) {
		throw new Error(`Figma sync failed: ${JSON.stringify(result)}`);
	}

	const created = result.meta?.tempIdToRealId ? Object.keys(result.meta.tempIdToRealId).length : 0;

	console.log(chalk.green(`✓ Synced to Figma (${created} new entities created)`));
}
