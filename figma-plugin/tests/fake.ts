import type { Api, Collection, EffectStyle, FontName, TextStyle, Variable } from '../src/sync';
import type { RepairApi } from '../src/repair';

/** An in-memory stand-in for the slice of Figma's API the plugin uses. */
export function fakeFigma(
	fonts: FontName[] = [
		{ family: 'JetBrains Mono', style: 'Regular' },
		{ family: 'JetBrains Mono', style: 'Medium' },
		{ family: 'JetBrains Mono', style: 'Bold' },
	]
) {
	let ids = 0;
	const collections: (Collection & { modeList: { modeId: string; name: string }[] })[] = [];
	const variables: (Variable & { values: Record<string, unknown> })[] = [];
	const textStyles: (TextStyle & { bound?: string })[] = [];
	const effectStyles: EffectStyle[] = [];
	const api: Api = {
		getCollections: async () => collections,
		createCollection: (name) => {
			const collection = {
				id: `c${ids++}`,
				name,
				modeList: [{ modeId: `m${ids++}`, name: 'Mode 1' }],
				get modes() {
					return this.modeList;
				},
				renameMode(modeId: string, next: string) {
					this.modeList.find((m) => m.modeId === modeId)!.name = next;
				},
				addMode(next: string) {
					const modeId = `m${ids++}`;
					this.modeList.push({ modeId, name: next });
					return modeId;
				},
			};
			collections.push(collection);
			return collection;
		},
		getVariables: async () => [...variables],
		createVariable: (name, collection, type) => {
			const variable = {
				id: `v${ids++}`,
				name,
				variableCollectionId: collection.id,
				resolvedType: type,
				scopes: [] as readonly string[],
				values: {} as Record<string, unknown>,
				setValueForMode(modeId: string, value: unknown) {
					this.values[modeId] = value;
				},
			};
			variables.push(variable);
			return variable;
		},
		alias: (variable) => ({ type: 'VARIABLE_ALIAS', id: variable.id }),
		availableFonts: async () => fonts,
		loadFont: async () => {},
		getTextStyles: async () => [...textStyles],
		createTextStyle: () => {
			const style = {
				name: '',
				description: '',
				fontName: { family: '', style: '' },
				fontSize: 0,
				lineHeight: null,
				letterSpacing: null,
				textCase: '',
				bound: undefined as string | undefined,
				setBoundVariable(_field: 'fontSize', variable: Variable | null) {
					this.bound = variable?.name;
				},
			};
			textStyles.push(style);
			return style;
		},
		getEffectStyles: async () => [...effectStyles],
		createEffectStyle: () => {
			const style = { name: '', description: '', effects: [] as readonly unknown[] };
			effectStyles.push(style);
			return style;
		},
		bindEffectColor: (effect, variable) => ({
			...(effect as object),
			boundVariables: { color: { id: variable.id } },
		}),
	};
	const repairApi: RepairApi = {
		getCollections: api.getCollections,
		getVariables: api.getVariables,
		variableById: async (id) => variables.find((v) => v.id === id) ?? null,
		collectionById: async (id) => collections.find((c) => c.id === id) ?? null,
		bindPaint: (paint, variable) => ({
			...(paint as object),
			boundVariables: { color: { id: variable.id } },
		}),
		bindEffect: api.bindEffectColor,
	};
	return { api, repairApi, collections, variables, textStyles, effectStyles };
}
