import type { FigmaData } from 'three-forma-styli';
import type { Collection, Variable } from './sync';

/**
 * "Repair selection": layers pasted from older files or earlier syncs can stay bound
 * to variables in other collections that share TFS's names (`clr/bg`). This rebinds
 * them, by name, to the variables in TFS's own collections, moves frame mode choices
 * across when TFS has a mode of the same name, and lists what it could not fix.
 */

type Alias = { readonly id: string };
type Bindable = { readonly boundVariables?: { readonly color?: Alias } };

export type RepairNode = {
	readonly name: string;
	readonly children?: readonly RepairNode[];
	fills?: unknown;
	strokes?: unknown;
	effects?: unknown;
	readonly boundVariables?: Readonly<Record<string, unknown>>;
	readonly explicitVariableModes?: Readonly<Record<string, string>>;
	setBoundVariable?(field: string, variable: Variable): void;
	clearExplicitVariableModeForCollection?(collection: Collection): void;
	setExplicitVariableModeForCollection?(collection: Collection, modeId: string): void;
};

export type RepairApi = {
	getCollections(): Promise<Collection[]>;
	getVariables(): Promise<Variable[]>;
	variableById(id: string): Promise<Variable | null>;
	collectionById(id: string): Promise<Collection | null>;
	bindPaint(paint: unknown, variable: Variable): unknown;
	bindEffect(effect: unknown, variable: Variable): unknown;
};

export type RepairReport = { rebound: number; modes: number; manual: string[] };

/** Bindings Figma keeps as lists of layer paints/effects or text ranges, handled separately. */
const LISTS = new Set([
	'fills',
	'strokes',
	'effects',
	'layoutGrids',
	'componentProperties',
	'textRangeFills',
]);

export async function repairSelection(
	api: RepairApi,
	data: FigmaData,
	selection: readonly RepairNode[]
): Promise<RepairReport> {
	const report: RepairReport = { rebound: 0, modes: 0, manual: [] };
	const names = new Set(data.collections.map((c) => c.name));
	const tfsCollections = (await api.getCollections()).filter((c) => names.has(c.name));
	const tfsIds = new Set(tfsCollections.map((c) => c.id));
	const tfsVariables = new Map(
		(await api.getVariables())
			.filter((v) => tfsIds.has(v.variableCollectionId))
			.map((v) => [v.name, v])
	);

	/** The TFS variable to use instead, or undefined when the binding is already TFS's. */
	async function replacement(
		node: RepairNode,
		what: string,
		alias: Alias
	): Promise<Variable | undefined> {
		const current = await api.variableById(alias.id);
		if (current && tfsIds.has(current.variableCollectionId)) return undefined;
		const target = current ? tfsVariables.get(current.name) : undefined;
		if (!target) {
			report.manual.push(
				current
					? `${node.name}: ${what} uses ${current.name}, which TFS doesn't have`
					: `${node.name}: ${what} uses a variable that no longer exists`
			);
		}
		return target;
	}

	async function rebindList(
		node: RepairNode,
		field: 'fills' | 'strokes' | 'effects'
	): Promise<void> {
		const list = node[field];
		if (!Array.isArray(list)) return;
		let changed = false;
		const next = [];
		for (const item of list as Bindable[]) {
			const alias = item.boundVariables?.color;
			const target = alias ? await replacement(node, field.slice(0, -1), alias) : undefined;
			if (target) {
				next.push(field === 'effects' ? api.bindEffect(item, target) : api.bindPaint(item, target));
				report.rebound++;
				changed = true;
			} else next.push(item);
		}
		if (changed) node[field] = next;
	}

	async function visit(node: RepairNode): Promise<void> {
		await rebindList(node, 'fills');
		await rebindList(node, 'strokes');
		await rebindList(node, 'effects');

		for (const [field, value] of Object.entries(node.boundVariables ?? {})) {
			if (LISTS.has(field)) {
				if (field === 'textRangeFills' || field === 'layoutGrids')
					report.manual.push(`${node.name}: ${field} bindings need rebinding by hand`);
				continue;
			}
			if (Array.isArray(value)) {
				// Per-range text bindings (font size etc.); re-applying the TFS text style fixes them.
				for (const alias of value as Alias[]) {
					const current = await api.variableById(alias.id);
					if (!current || !tfsIds.has(current.variableCollectionId)) {
						report.manual.push(`${node.name}: text ${field} — re-apply its TFS text style`);
						break;
					}
				}
				continue;
			}
			const target = await replacement(node, field, value as Alias);
			if (target && node.setBoundVariable) {
				node.setBoundVariable(field, target);
				report.rebound++;
			}
		}

		for (const [collectionId, modeId] of Object.entries(node.explicitVariableModes ?? {})) {
			if (tfsIds.has(collectionId)) continue;
			const old = await api.collectionById(collectionId);
			if (!old) {
				report.manual.push(`${node.name}: mode set for a collection that no longer exists`);
				continue;
			}
			const modeName = old.modes.find((m) => m.modeId === modeId)?.name;
			node.clearExplicitVariableModeForCollection?.(old);
			report.modes++;
			const successor = tfsCollections.find((c) => c.modes.some((m) => m.name === modeName));
			const alreadySet = successor && node.explicitVariableModes?.[successor.id];
			if (successor && !alreadySet) {
				node.setExplicitVariableModeForCollection?.(
					successor,
					successor.modes.find((m) => m.name === modeName)!.modeId
				);
			}
		}

		for (const child of node.children ?? []) await visit(child);
	}

	for (const node of selection) await visit(node);
	return report;
}
