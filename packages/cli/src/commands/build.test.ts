import { describe, expect, it } from 'vitest';
import path from 'path';
import { parseOutputFormat, relativeStylesheetHref } from './build.js';

describe('parseOutputFormat', () => {
	it('accepts the typed typography contract output', () => {
		expect(parseOutputFormat('typescript')).toBe('typescript');
	});

	it('accepts the standalone specimen output', () => {
		expect(parseOutputFormat('specimen')).toBe('specimen');
	});

	it('rejects unsupported formats', () => {
		expect(() => parseOutputFormat('scss')).toThrow('Unsupported output format');
	});

	it('links font CSS relative to the specimen output directory', () => {
		expect(
			relativeStylesheetHref(
				path.join('/project', 'previews', 'type.html'),
				path.join('/project', 'generated', 'fonts.css')
			)
		).toBe('../generated/fonts.css');
		expect(
			relativeStylesheetHref(
				path.join('/project', 'previews', 'type.html'),
				path.join('/project', 'previews', 'fonts.css')
			)
		).toBe('./fonts.css');
	});
});
