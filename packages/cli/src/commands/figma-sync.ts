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

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import * as esbuild from 'esbuild';
import {
  generateFigmaJson,
  type DesignSystem,
  type FigmaCollection,
} from '@three-forma-styli/core';

// ─── Figma API Types ──────────────────────────────────────────

interface FigmaApiVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
}

interface FigmaApiCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  variableIds: string[];
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
    throw new Error(`Payload too large (${(body.length / 1024 / 1024).toFixed(1)}MB) — Figma limit is 4MB`);
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

/**
 * Build the Figma API payload to sync a collection of variables.
 *
 * Strategy:
 * - If collection doesn't exist → CREATE collection + modes + variables + values
 * - If collection exists → UPDATE modes + variables + values (match by name)
 */
export function buildPayload(
  collection: FigmaCollection,
  existing: FigmaGetResponse['meta']
): Record<string, unknown[]> {
  if (collection.modes.length > 40) {
    throw new Error(`Figma collections support at most 40 modes (received ${collection.modes.length})`);
  }
  if (collection.variables.length > 5000) {
    throw new Error(`Figma collections support at most 5000 variables (received ${collection.variables.length})`);
  }

  const variableCollections: Record<string, unknown>[] = [];
  const variableModes: Record<string, unknown>[] = [];
  const variables: Record<string, unknown>[] = [];
  const variableModeValues: Record<string, unknown>[] = [];

  // Find existing collection by name
  const existingCollection = Object.values(existing.variableCollections)
    .find(c => c.name === collection.name);

  let collectionId: string;
  const modeIdMap = new Map<string, string>(); // our mode name → figma mode ID

  if (existingCollection) {
    // ── UPDATE existing collection ──
    collectionId = existingCollection.id;

    // Map existing modes by name
    const existingModesByName = new Map(
      existingCollection.modes.map(m => [m.name, m.modeId])
    );

    const currentDefaultMode = existingCollection.modes.find(
      mode => mode.modeId === existingCollection.defaultModeId
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
        const tempId = `temp_mode_${modeName}`;
        modeIdMap.set(modeName, tempId);
        variableModes.push({
          action: 'CREATE',
          id: tempId,
          name: modeName,
          variableCollectionId: collectionId,
        });
      }
    }

  } else {
    // ── CREATE new collection ──
    collectionId = `temp_collection_${collection.name}`;
    const initialModeId = `temp_mode_${collection.defaultMode}`;
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
      const tempId = `temp_mode_${modeName}`;
      modeIdMap.set(modeName, tempId);
      variableModes.push({
        action: 'CREATE',
        id: tempId,
        name: modeName,
        variableCollectionId: collectionId,
      });
    }
  }

  // Build variable name → existing ID map
  const existingVarsByName = new Map<string, string>();
  if (existingCollection) {
    for (const [varId, v] of Object.entries(existing.variables)) {
      if (v.variableCollectionId === existingCollection.id) {
        existingVarsByName.set(v.name, varId);
      }
    }
  }

  // Create or update variables and set mode values
  for (const variable of collection.variables) {
    const existingVarId = existingVarsByName.get(variable.name);
    let variableId: string;

    if (existingVarId) {
      variableId = existingVarId;
      // Variable already exists — just update values (no need to UPDATE the variable itself
      // unless we want to change name/description)
    } else {
      variableId = `temp_var_${variable.name}`;
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

  return { variableCollections, variableModes, variables, variableModeValues };
}

// ─── Public Command ───────────────────────────────────────────

/**
 * Load a DesignSystem from a TypeScript theme file (same logic as build command)
 */
async function loadDesignSystem(filePath: string): Promise<DesignSystem> {
  let inputPath = path.resolve(process.cwd(), filePath);

  if (await fs.pathExists(inputPath)) {
    const stats = await fs.stat(inputPath);
    if (stats.isDirectory()) {
      inputPath = path.join(inputPath, 'index.ts');
    }
  }

  if (!await fs.pathExists(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  console.log(chalk.cyan(`Loading theme from: ${path.relative(process.cwd(), inputPath)}`));

  const tempFile = path.join(os.tmpdir(), `tfs-figma-${Date.now()}.mjs`);

  try {
    await esbuild.build({
      entryPoints: [inputPath],
      bundle: true,
      outfile: tempFile,
      format: 'esm',
      platform: 'node',
      target: 'node18',
    });

    const mod = await import(`${tempFile}?t=${Date.now()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exported: any = mod.default || mod.theme || mod.designSystem;
    let ds: DesignSystem;
    if (exported && !exported.colors && (exported.default || exported.designSystem)) {
      ds = exported.default || exported.designSystem;
    } else {
      ds = exported;
    }
    if (!ds || !ds.colors) {
      throw new Error('No valid design system found (must have colors property)');
    }
    return ds;
  } finally {
    if (await fs.pathExists(tempFile)) {
      await fs.remove(tempFile);
    }
  }
}

export interface FigmaSyncOptions {
  fileKey: string;
  token?: string;
  dryRun?: boolean;
  collectionName?: string;
  colorSpace?: 'srgb' | 'display-p3';
}

export async function figmaSyncCommand(
  filePath: string,
  options: FigmaSyncOptions
): Promise<void> {
  const token = options.token || process.env.FIGMA_TOKEN;
  if (!options.dryRun && !token) {
    console.error(chalk.red('✗ No Figma token. Set FIGMA_TOKEN env var or pass --figma-token.'));
    console.error(chalk.yellow('  Create one at: Figma → Settings → Security → Personal access tokens'));
    console.error(chalk.yellow('  Required scopes: file_variables:read and file_variables:write'));
    process.exit(1);
  }

  // Load design system from theme file
  const designSystem = await loadDesignSystem(filePath);

  // Generate profile-aware values. Display-P3 components are meaningful only
  // when the target Figma file itself uses the Display P3 profile.
  const jsonStr = generateFigmaJson(designSystem, {
    transformer: {
      collectionName: options.collectionName,
      colorSpace: options.colorSpace ?? 'srgb',
    },
  }, 'figma-variables');

  const parsed = JSON.parse(jsonStr);
  const collection: FigmaCollection = parsed.collections[0];

  console.log(chalk.cyan(`Syncing "${collection.name}" to Figma...`));
  console.log(chalk.gray(`  Modes: ${collection.modes.join(', ')}`));
  console.log(chalk.gray(`  Variables: ${collection.variables.length}`));
  console.log(chalk.gray(`  Color space: ${options.colorSpace ?? 'srgb'}`));

  if (options.dryRun) {
    // In dry-run mode, just dump the payload
    console.log(chalk.yellow('\n[DRY RUN] Would send this payload:\n'));

    // Build a fake empty existing state for dry run
    const fakeExisting = { variables: {}, variableCollections: {} };
    const payload = buildPayload(collection, fakeExisting);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // Step 1: GET existing variables
  console.log(chalk.gray('  Fetching existing variables...'));
  const existing = await figmaGet(options.fileKey, token!);

  const existingCollection = Object.values(existing.meta.variableCollections)
    .find(c => c.name === collection.name);

  if (existingCollection) {
    console.log(chalk.gray(`  Found existing collection "${collection.name}" — will update`));
  } else {
    console.log(chalk.gray(`  Collection "${collection.name}" not found — will create`));
  }

  // Step 2: Build and POST payload
  const payload = buildPayload(collection, existing.meta);

  const stats = {
    collections: payload.variableCollections.length,
    modes: payload.variableModes.length,
    variables: payload.variables.length,
    values: payload.variableModeValues.length,
  };

  console.log(chalk.gray(
    `  Payload: ${stats.collections} collections, ${stats.modes} modes, ` +
    `${stats.variables} variables, ${stats.values} values`
  ));

  const result = await figmaPost(options.fileKey, token!, payload);

  if (result.error) {
    console.error(chalk.red('✗ Figma sync failed'));
    console.error(result);
    process.exit(1);
  }

  const created = result.meta?.tempIdToRealId
    ? Object.keys(result.meta.tempIdToRealId).length
    : 0;

  console.log(chalk.green(`✓ Synced to Figma (${created} new entities created)`));
}
