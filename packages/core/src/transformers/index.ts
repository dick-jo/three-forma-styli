/**
 * Transformers - convert IR to output formats
 */

export { toCss, defaultCssConfig } from './css.js';
export type { CssTransformerConfig, FileHeaderConfig } from './css.js';

export { toFigmaJson } from './figma-json.js';
export type {
	FigmaJsonTransformerConfig,
	FigmaJsonFormat,
	FigmaCollection,
	FigmaVariable,
	FigmaColor,
} from './figma-json.js';

export { toTypographyTypescript } from './typography-typescript.js';
export { toTypographySpecimen } from './typography-specimen.js';
export type { TypographySpecimenConfig } from './typography-specimen.js';
export { toTypographyCss, toTypographyCssModuleTypes } from './typography-css.js';
export type { TypographyCssConfig } from './typography-css.js';

// Re-export header utilities for other transformers
export { getHeaderLines, formatHeaderComment } from '../header.js';
export type { FileHeaderInfo, CommentStyle } from '../header.js';
