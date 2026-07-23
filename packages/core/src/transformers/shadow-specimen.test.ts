import { describe, expect, it } from 'vitest';
import { generate, oklch } from '../index.js';
import { toShadowSpecimen } from './shadow-specimen.js';

const ir = generate({
	colors: {
		modes: [
			{
				name: 'dark',
				isDefault: true,
				tokens: {
					bg: oklch(0.2, 0, 0),
					ev: oklch(0.3, 0, 0),
					ink: oklch(0.95, 0, 0),
					pri: oklch(0.7, 0.2, 300),
				},
			},
			{ name: 'light', tokens: { bg: oklch(0.98, 0, 0), ink: oklch(0.1, 0, 0) } },
		],
		alphaSchedule: { min: 0.08, lo: 0.2 },
	},
	shadows: {
		unit: 'px',
		box: {
			elevation: {
				base: [{ x: 0, y: 4, blur: 16, color: { color: 'ink', alpha: 'min' } }],
			},
		},
		text: {
			glow: {
				base: [{ x: 0, y: 0, blur: 8, color: { color: 'pri', alpha: 'lo' } }],
			},
		},
	},
});

describe('shadow specimen', () => {
	it('renders clipping, banding, mode and animation diagnostics', () => {
		const html = toShadowSpecimen(ir, { title: 'Shadow proof' });
		expect(html).toContain('<title>Shadow proof</title>');
		expect(html).toContain('class="box-stage clipped"');
		expect(html).toContain('--shadow-box-elevation');
		expect(html).toContain('--shadow-text-glow');
		expect(html).toContain('<option value="light">light</option>');
		expect(html).toContain('animate comparisons');
	});

	it('supports a non-interactive review artifact', () => {
		const html = toShadowSpecimen(ir, { interactive: false });
		expect(html).not.toContain('id="mode"');
		expect(html).not.toContain('<script>');
	});
});
