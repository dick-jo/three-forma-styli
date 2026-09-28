import type { FigmaData } from 'three-forma-styli';
import {
	sync,
	type Api,
	type Collection,
	type EffectStyle,
	type TextStyle,
	type Variable,
} from './sync';

// Connects the real Figma API to the sync logic.
const api: Api = {
	getCollections: () => figma.variables.getLocalVariableCollectionsAsync() as Promise<Collection[]>,
	createCollection: (name) =>
		figma.variables.createVariableCollection(name) as unknown as Collection,
	getVariables: () => figma.variables.getLocalVariablesAsync() as Promise<Variable[]>,
	createVariable: (name, collection, type) =>
		figma.variables.createVariable(
			name,
			collection as unknown as VariableCollection,
			type
		) as unknown as Variable,
	alias: (variable) =>
		figma.variables.createVariableAlias(variable as unknown as globalThis.Variable),
	availableFonts: async () => (await figma.listAvailableFontsAsync()).map((font) => font.fontName),
	loadFont: (font) => figma.loadFontAsync(font),
	getTextStyles: () => figma.getLocalTextStylesAsync() as unknown as Promise<TextStyle[]>,
	createTextStyle: () => figma.createTextStyle() as unknown as TextStyle,
	getEffectStyles: () => figma.getLocalEffectStylesAsync() as unknown as Promise<EffectStyle[]>,
	createEffectStyle: () => figma.createEffectStyle() as unknown as EffectStyle,
	bindEffectColor: (effect, variable) =>
		figma.variables.setBoundVariableForEffect(
			effect as Effect,
			'color',
			variable as unknown as globalThis.Variable
		),
};

figma.showUI(__html__, { width: 420, height: 520, themeColors: true });

figma.ui.onmessage = async (message: { type: 'sync'; json: string }) => {
	if (message.type !== 'sync') return;
	try {
		const report = await sync(api, JSON.parse(message.json) as FigmaData);
		figma.ui.postMessage({ type: 'report', report });
		figma.notify(
			`TFS: ${report.created.length} created, ${report.updated.length} updated${report.errors.length ? `, ${report.errors.length} errors` : ''}`
		);
	} catch (error) {
		figma.ui.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
