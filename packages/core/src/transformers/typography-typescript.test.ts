import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { generate } from '../generator/index.js';
import { toTypographyTypescript } from './typography-typescript.js';
import type { DesignSystem } from '../types.js';

function typecheck(source: string): string[] {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-types-'));
	const fixture = path.join(directory, 'fixture.ts');
	try {
		fs.writeFileSync(fixture, source);
		const program = ts.createProgram([fixture], {
			strict: true,
			noEmit: true,
			target: ts.ScriptTarget.ES2020,
			skipLibCheck: true,
		});
		return ts
			.getPreEmitDiagnostics(program)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

const typography: DesignSystem['typography'] = {
	modes: [
		{
			name: 'default',
			isDefault: true,
			tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 8 },
		},
	],
	fonts: {
		ui: {
			family: 'UI',
			fallbacks: ['sans-serif'],
			verification: 'prepared',
			capabilities: {
				faces: [
					{ style: 'normal', weights: [400, 700] },
					{ style: 'italic', weights: [400] },
				],
			},
		},
	},
	roles: {
		interface: {
			font: 'ui',
			textTransform: 'uppercase',
			sizes: {
				min: {
					fontSize: 1,
					weight: 'max',
					lineHeight: 1.1,
					letterSpacing: 0.01,
					textTransform: 'lowercase',
				},
				base: { fontSize: 2, weight: 'min', lineHeight: 1.2, letterSpacing: 0 },
			},
			variants: {
				emphatic: { weight: 'max', letterSpacing: -0.01 },
			},
			weights: { min: 400, max: 700 },
			styles: {
				normal: { weights: ['min', 'max'] },
				italic: { weights: ['min'] },
			},
		},
	},
};

describe('toTypographyTypescript', () => {
	it('emits literal role-specific base, variant, weight, and style contracts', () => {
		const output = toTypographyTypescript(generate({ typography }));
		expect(output).toContain('export const typography =');
		expect(output).toContain('"fontFamily": "var(--text-interface-font-family)"');
		expect(output).toContain('"base"');
		expect(output).toContain('"min"');
		expect(output).toContain('"fontSize": "var(--text-interface-min-font-size)"');
		expect(output).toContain('"fontWeight": "var(--text-interface-min-font-weight)"');
		expect(output).toContain('"weight": "max"');
		expect(output).toContain('"textTransform": "var(--text-interface-text-transform)"');
		expect(output).toContain('"textTransformValue": "uppercase"');
		expect(output).toContain('"textTransformValue": "lowercase"');
		expect(output).toContain('"base": "interface"');
		expect(output).toContain('"min": "interface-min"');
		expect(output).toContain('"emphatic": "interface-variant-emphatic"');
		expect(output).toContain('"italic"');
		expect(output).toContain('"min": "interface-style-italic-weight-min"');
		expect(output).not.toContain('"defaultWeight"');
		expect(output).not.toContain('"fonts":');
		expect(output).toContain('export type TypographyVariant<R extends TypographyRole>');
		expect(output).toContain('export type TypographyClassKey =');
		expect(output).toContain('export function typographyClassName(');
	});

	it('uses configured token prefixes', () => {
		const output = toTypographyTypescript(
			generate({ typography }, { prefixes: { typographyRole: 'copy' } })
		);
		expect(output).toContain('var(--copy-interface-font-family)');
		expect(output).toContain('var(--copy-interface-min-font-size)');
	});

	it('type-checks variants and style-specific weight combinations', () => {
		const output = toTypographyTypescript(generate({ typography }));
		expect(
			typecheck(
				`${output}
const base: TypographySelection = { role: 'interface' };
const explicitDefaultStyle: TypographySelection = { role: 'interface', fontStyle: 'normal' };
const compact: TypographySelection = { role: 'interface', size: 'min' };
const emphatic: TypographySelection = { role: 'interface', variant: 'emphatic' };
const italic: TypographySelection = { role: 'interface', fontStyle: 'italic', weight: 'min' };
const classes: TypographyClassMap = {
  interface: 'base',
  'interface-min': 'compact',
  'interface-variant-emphatic': 'emphatic',
  'interface-style-normal-weight-min': 'normal-min',
  'interface-style-normal-weight-max': 'normal-max',
  'interface-style-italic-weight-min': 'italic-min',
};
const className: string = typographyClassName(compact, classes);
void base; void explicitDefaultStyle; void compact; void emphatic; void italic; void className;
// @ts-expect-error unknown size
const badVariant: TypographySelection = { role: 'interface', size: 'display' };
// @ts-expect-error unknown categorical variant
const badSemanticVariant: TypographySelection = { role: 'interface', variant: 'display' };
// @ts-expect-error italic does not expose max
const badItalic: TypographySelection = { role: 'interface', fontStyle: 'italic', weight: 'max' };
// @ts-expect-error an explicit style requires an explicit valid pair weight
const missingItalicWeight: TypographySelection = { role: 'interface', fontStyle: 'italic' };
// @ts-expect-error class maps must contain every generated key
const incompleteClasses: TypographyClassMap = { interface: 'base' };
void badVariant; void badSemanticVariant; void badItalic; void missingItalicWeight; void incompleteClasses;
`
			)
		).toEqual([]);
	});

	it('fails clearly when no semantic typography contract exists', () => {
		const ir = generate({
			typography: {
				modes: [
					{
						name: 'default',
						isDefault: true,
						tokens: { unit: 'rem', base: 1, min: 0.75, increment: 0.25, range: 12 },
					},
				],
			},
		});
		expect(() => toTypographyTypescript(ir)).toThrow(
			'A typography system with semantic roles is required'
		);
	});
});
