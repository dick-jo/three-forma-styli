/**
 * Transformers - convert IR to output formats
 */

export { toCss, defaultCssConfig } from './css.js';
export type { CssTransformerConfig, FileHeaderConfig } from './css.js';

// Re-export header utilities for other transformers
export { getHeaderLines, formatHeaderComment } from '../header.js';
export type { FileHeaderInfo, CommentStyle } from '../header.js';
