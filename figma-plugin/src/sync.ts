import type { FigmaData, FigmaValue } from 'three-forma-styli';

/**
 * Applies TFS's figma.json to a Figma file. Works against this small slice of
 * Figma's API so it can be tested without Figma. Rules: match by name, update
 * in place, create what is missing, never delete — stale items are reported.
 */

export type Mode = { readonly modeId: string; readonly name: string };
export type Collection = {
	readonly id: string;
	readonly name: string;
	readonly modes: readonly Mode[];
	renameMode(modeId: string, name: string): void;
	addMode(name: string): string;
};
export type Variable = {
	readonly id: string;
	readonly name: string;
	readonly variableCollectionId: string;
	readonly resolvedType: string;
	scopes: readonly string[];
	setValueForMode(modeId: string, value: unknown): void;
};
export type FontName = { readonly family: string; readonly style: string };
export type TextStyle = {
	name: string;
	description: string;
	fontName: FontName;
	fontSize: number;
	lineHeight: unknown;
	letterSpacing: unknown;
	textCase: string;
	setBoundVariable(field: 'fontSize', variable: Variable | null): void;
};
export type EffectStyle = { name: string; description: string; effects: readonly unknown[] };

export type Api = {
	getCollections(): Promise<Collection[]>;
	createCollection(name: string): Collection;
	getVariables(): Promise<Variable[]>;
	createVariable(name: string, collection: Collection, type: 'COLOR' | 'FLOAT'): Variable;
	alias(variable: Variable): unknown;
	availableFonts(): Promise<FontName[]>;
	loadFont(font: FontName): Promise<void>;
	getTextStyles(): Promise<TextStyle[]>;
	createTextStyle(): TextStyle;
	getEffectStyles(): Promise<EffectStyle[]>;
	createEffectStyle(): EffectStyle;
	bindEffectColor(effect: unknown, variable: Variable): unknown;
};

export type Report = {
	created: string[];
	updated: string[];
	stale: string[];
	skipped: string[];
	errors: string[];
};

/** Marks styles TFS manages, so stale ones can be found without touching anyone else's. */
const MARKER = 'three-forma-styli';

/** Figma addresses weights by style name, spelled differently per foundry. */
const WEIGHT_NAMES: Record<number, string[]> = {
	100: ['Thin', 'Hairline'],
	200: ['ExtraLight', 'Extralight', 'Extra Light', 'UltraLight', 'Ultralight'],
	300: ['Light'],
	400: ['Regular', 'Normal', 'Book'],
	500: ['Medium'],
	600: ['SemiBold', 'Semibold', 'Semi Bold', 'DemiBold', 'Demibold'],
	700: ['Bold'],
	800: ['ExtraBold', 'Extrabold', 'Extra Bold', 'UltraBold', 'Ultrabold'],
	900: ['Black', 'Heavy'],
};

async function syncVariables(
	api: Api,
	data: FigmaData,
	report: Report
): Promise<Map<string, Variable>> {
	const collections = await api.getCollections();
	const existing = await api.getVariables();
	const byName = new Map(existing.map((variable) => [variable.name, variable]));
	const pending: { variable: Variable; values: readonly FigmaValue[]; modeIds: string[] }[] = [];

	for (const spec of data.collections) {
		let collection = collections.find((c) => c.name === spec.name);
		const created = !collection;
		collection ??= api.createCollection(spec.name);
		if (created) report.created.push(`collection ${spec.name}`);

		const modeIds = spec.modes.map((name, index) => {
			const found = collection!.modes.find((mode) => mode.name === name);
			if (found) return found.modeId;
			if (created && index === 0) {
				collection!.renameMode(collection!.modes[0]!.modeId, name);
				return collection!.modes[0]!.modeId;
			}
			return collection!.addMode(name);
		});
		for (const mode of collection.modes) {
			if (!spec.modes.includes(mode.name) && !(created && mode.modeId === modeIds[0]))
				report.stale.push(`mode ${spec.name}/${mode.name}`);
		}

		const wanted = new Set(spec.variables.map((variable) => variable.name));
		for (const variable of existing) {
			if (variable.variableCollectionId === collection.id && !wanted.has(variable.name))
				report.stale.push(`variable ${variable.name}`);
		}

		for (const want of spec.variables) {
			let variable = byName.get(want.name);
			if (
				variable &&
				(variable.variableCollectionId !== collection.id || variable.resolvedType !== want.type)
			) {
				report.errors.push(
					`variable ${want.name} already exists as a different kind or in another collection; rename or remove it in Figma`
				);
				continue;
			}
			if (variable) report.updated.push(`variable ${want.name}`);
			else {
				variable = api.createVariable(want.name, collection, want.type);
				byName.set(want.name, variable);
				report.created.push(`variable ${want.name}`);
			}
			variable.scopes = want.scopes;
			pending.push({ variable, values: want.values, modeIds });
		}
	}

	// Values after every variable exists, so aliases can point anywhere.
	for (const { variable, values, modeIds } of pending) {
		values.forEach((value, index) => {
			if (typeof value === 'object' && 'alias' in value) {
				const target = byName.get(value.alias);
				if (!target)
					report.errors.push(`variable ${variable.name}: alias target ${value.alias} is missing`);
				else variable.setValueForMode(modeIds[index]!, api.alias(target));
			} else {
				variable.setValueForMode(modeIds[index]!, value);
			}
		});
	}
	return byName;
}

async function syncTextStyles(
	api: Api,
	data: FigmaData,
	variables: Map<string, Variable>,
	report: Report
): Promise<void> {
	const fonts = new Map<string, string[]>();
	for (const font of await api.availableFonts())
		fonts.set(font.family, [...(fonts.get(font.family) ?? []), font.style]);
	const existing = await api.getTextStyles();

	for (const want of data.textStyles) {
		const styles = fonts.get(want.family);
		if (!styles) {
			report.skipped.push(
				`text style ${want.name}: font "${want.family}" is not available in Figma`
			);
			continue;
		}
		const style = (WEIGHT_NAMES[want.weight] ?? []).find((name) => styles.includes(name));
		if (!style) {
			report.skipped.push(
				`text style ${want.name}: ${want.family} has no style for weight ${want.weight} (has ${styles.join(', ')})`
			);
			continue;
		}
		const fontName = { family: want.family, style };
		await api.loadFont(fontName);
		let text = existing.find((s) => s.name === want.name);
		if (text) report.updated.push(`text style ${want.name}`);
		else {
			text = api.createTextStyle();
			text.name = want.name;
			report.created.push(`text style ${want.name}`);
		}
		text.description = MARKER;
		text.fontName = fontName;
		text.fontSize = want.fontSize.px;
		text.lineHeight = { unit: 'PERCENT', value: want.lineHeightPercent };
		text.letterSpacing = { unit: 'PERCENT', value: want.letterSpacingPercent };
		text.textCase = want.textCase ?? 'ORIGINAL';
		const size = variables.get(want.fontSize.variable);
		if (size) text.setBoundVariable('fontSize', size);
	}
	const wanted = new Set(data.textStyles.map((s) => s.name));
	for (const style of existing)
		if (style.description === MARKER && !wanted.has(style.name))
			report.stale.push(`text style ${style.name}`);
}

async function syncEffectStyles(
	api: Api,
	data: FigmaData,
	variables: Map<string, Variable>,
	report: Report
): Promise<void> {
	const existing = await api.getEffectStyles();
	for (const want of data.effectStyles) {
		const missing = want.layers.find((layer) => !variables.has(layer.color));
		if (missing) {
			report.errors.push(`effect style ${want.name}: colour variable ${missing.color} is missing`);
			continue;
		}
		const effects = want.layers.map((layer) =>
			api.bindEffectColor(
				{
					type: layer.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
					color: { r: 0, g: 0, b: 0, a: 1 },
					offset: { x: layer.x, y: layer.y },
					radius: layer.blur,
					spread: layer.spread,
					visible: true,
					blendMode: 'NORMAL',
					...(layer.inset ? {} : { showShadowBehindNode: false }),
				},
				variables.get(layer.color)!
			)
		);
		let style = existing.find((s) => s.name === want.name);
		if (style) report.updated.push(`effect style ${want.name}`);
		else {
			style = api.createEffectStyle();
			style.name = want.name;
			report.created.push(`effect style ${want.name}`);
		}
		style.description = MARKER;
		style.effects = effects;
	}
	const wanted = new Set(data.effectStyles.map((s) => s.name));
	for (const style of existing)
		if (style.description === MARKER && !wanted.has(style.name))
			report.stale.push(`effect style ${style.name}`);
}

export async function sync(api: Api, data: FigmaData): Promise<Report> {
	if (data.version !== 1)
		throw new Error(
			`This plugin reads figma.json version 1; got ${String(data.version)}. Update the plugin.`
		);
	const report: Report = {
		created: [],
		updated: [],
		stale: [],
		skipped: [...data.skipped],
		errors: [],
	};
	const variables = await syncVariables(api, data, report);
	await syncTextStyles(api, data, variables, report);
	await syncEffectStyles(api, data, variables, report);
	return report;
}
