import { expect, it } from 'vitest';
import {
	emitColorThemeJs,
	emitColorThemeTypes,
	emitFigmaJson,
	emitTokensCss,
	emitTokensJs,
	emitTokensTypes,
	emitTypographyCss,
	emitTypographyJs,
	emitTypographyModuleCss,
	emitTypographyModuleTypes,
	emitTypographyTypes,
} from 'three-forma-styli';
import { config, fonts, resolved } from './everything.js';

// The full generated output, committed so every change to it is a readable diff.
const outputs = {
	'tokens.css': emitTokensCss(resolved, fonts.stacks),
	'tokens.js': emitTokensJs(resolved, fonts.stacks),
	'tokens.d.ts': emitTokensTypes(resolved, fonts.stacks),
	'fonts.css': fonts.css,
	'typography.css': emitTypographyCss(resolved),
	'typography.module.css': emitTypographyModuleCss(resolved),
	'typography.module.css.d.ts': emitTypographyModuleTypes(resolved),
	'typography.js': emitTypographyJs(resolved),
	'typography.d.ts': emitTypographyTypes(resolved),
	'figma.json': emitFigmaJson(resolved, fonts.stacks),
	'color-theme.js': emitColorThemeJs(resolved, config.runtime.colorThemes),
	'color-theme.d.ts': emitColorThemeTypes(resolved, config.runtime.colorThemes),
};

it.each(Object.entries(outputs))('%s', async (file, content) => {
	await expect(content).toMatchFileSnapshot(`./fixtures/everything/expected/${file}`);
});
