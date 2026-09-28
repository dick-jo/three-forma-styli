import { describe, expect, it } from 'vitest';
import { resolveSystem, TfsError, type SystemInput } from 'three-forma-styli';
import config from './fixtures/everything/tfs.config.js';

const system = config.system as unknown as SystemInput;

/** Resolve a changed copy of the everything-project and return the reported problems. */
function problems(change: (system: any) => void): string[] {
	const copy = structuredClone(system) as any;
	change(copy);
	try {
		resolveSystem(copy);
	} catch (error) {
		if (error instanceof TfsError)
			return error.issues.map((issue) => `${issue.path}: ${issue.message}`);
		throw error;
	}
	return [];
}

describe('the everything-project resolves', () => {
	const resolved = resolveSystem(system);

	it('has one entry per registered mode', () => {
		expect(resolved.modes.map((mode) => `${mode.axis}.${mode.mode}`)).toEqual([
			'theme.dark',
			'theme.light',
			'size.regular',
			'size.s',
			'size.l',
		]);
		expect(resolved.modes[1]!.attribute).toBe('data-theme-mode');
	});

	it('applies only the selected mode', () => {
		const mode = (axis: string, name: string) =>
			resolved.modes.find((m) => m.axis === axis && m.mode === name)!.values;
		expect(resolved.ordinary.spacing).toMatchObject({ min: 4, step: 8 });
		expect(mode('size', 's').spacing).toMatchObject({ min: 3, step: 6 });
		expect(mode('size', 'regular').spacing).toEqual(resolved.ordinary.spacing);
		expect(mode('theme', 'light').spacing).toEqual(resolved.ordinary.spacing);
		expect(mode('theme', 'light').colors!.tokens.pri).toEqual({
			mode: 'oklch',
			l: 0.45,
			c: 0.18,
			h: 285,
		});
		expect(mode('theme', 'light').colors!.polarity).toBe('positive');
		expect(mode('size', 's').colors).toEqual(resolved.ordinary.colors);
		expect(mode('size', 'l').fontSize).toMatchObject({ min: 0.6875, start: 0.8125, step: 0.125 });
	});

	it('writes groups out as literal lists', () => {
		expect(resolved.groups).toEqual({ accents: ['pri', 'duo'] });
	});
});

describe('problems are reported with their path', () => {
	it.each([
		[
			'spacing min must stay below step in every mode',
			(s: any) => (s.spacing.modes.size.s.min = 7),
			'spacing.min (size: s): must be at least 0 and less than step 6 (got 7)',
		],
		[
			'gap must point at an existing spacing position',
			(s: any) => (s.gap.max = 13),
			"gap.max: must be 'min' or a Spacing position 1–12 (got 13)",
		],
		[
			'gap must increase',
			(s: any) => (s.gap.l = 1),
			'gap.l: must point past the previous position',
		],
		[
			'alpha must increase',
			(s: any) => (s.alpha.values.hi = 0.2),
			'alpha.values: hi (0.2) must be greater than lo (0.25)',
		],
		[
			'alpha max below 1',
			(s: any) => (s.alpha.values.max = 1),
			'alpha.values.max: must be less than 1',
		],
		[
			'colour channels in range',
			(s: any) => (s.colors.tokens.ink.l = 1.2),
			'colors.tokens.ink: must be oklch(l 0–1, c ≥ 0, h finite)',
		],
		[
			'prefix group must select something',
			(s: any) => (s.colors.groups.accents = { match: { prefix: 'zz-' } }),
			'colors.groups.accents: selects no colours',
		],
		[
			'one axis per value',
			(s: any) => (s.colors.modes.size = { s: { tokens: { pri: s.colors.tokens.pri } } }),
			'colors.tokens.pri: is changed by both theme and size; a value may follow only one axis',
		],
		[
			'modes must be registered',
			(s: any) => (s.spacing.modes.size.xl = { step: 12 }),
			'spacing.modes.size.xl: "xl" is not a mode of size',
		],
		[
			'mode cannot change count',
			(s: any) => (s.spacing.modes.size.s.count = 10),
			'spacing.modes.size.s.count: cannot be changed by a mode',
		],
		[
			'font size min below start in every mode',
			(s: any) => (s.fontSize.modes.size.l.min = 0.9),
			'fontSize.min (size: l): must be greater than 0 and less than start 0.8125 (got 0.9)',
		],
		[
			'role sizes grow',
			(s: any) => (s.typography.roles.label.sizes.l.fontSize = 2),
			'typography.roles.label.sizes.l.fontSize: must be larger than base',
		],
		[
			'role weight must be offered',
			(s: any) => (s.typography.roles.label.sizes.base.weight = 'mid'),
			'typography.roles.label.sizes.base.weight: must be one of min, lo, hi, max',
		],
		[
			's needs min',
			(s: any) => delete s.typography.roles.label.sizes.min,
			'typography.roles.label.sizes.s: needs min as well',
		],
		[
			'shadow blur not negative',
			(s: any) => (s.shadows.lo[0].blur = -1),
			'shadows.lo[0].blur: must be 0 or more',
		],
		[
			'shadow colour exists',
			(s: any) => (s.shadows.min[0].color.color = 'nope'),
			'shadows.min[0].color: "nope" is not a colour',
		],
		[
			'time increases',
			(s: any) => (s.time.values.hi = 50),
			'time.values: hi (50) must be greater than lo (100)',
		],
		[
			'linear easing inputs ordered',
			(s: any) =>
				(s.easings.duo = {
					type: 'linear',
					value: [
						[0, 0],
						[0.6, 0.5],
						[0.4, 1],
					],
				}),
			'easings.duo[2]: inputs must not go backwards',
		],
		[
			'font files are fonts',
			(s: any) => (s.typography.fonts.sans.files = ['./notes.txt']),
			'typography.fonts.sans.files: "./notes.txt" must be .woff2, .woff, .ttf or .otf',
		],
		[
			'identities are CSS-safe',
			(s: any) => (s.colors.tokens.Pri = s.colors.tokens.pri),
			'colors.tokens.Pri: "Pri" must be lowercase letters, digits and single hyphens, starting with a letter',
		],
		[
			'dependencies present',
			(s: any) => delete s.alpha,
			'colors: needs alpha (every colour gets an alpha ramp)',
		],
	])('%s', (_name, change, expected) => {
		expect(problems(change)).toContain(expected);
	});

	it('reports every problem at once', () => {
		const found = problems((s) => {
			s.gap.max = 13;
			s.time.values.hi = 50;
			s.shadows.lo[0].blur = -1;
		});
		expect(found).toHaveLength(3);
	});

	it('does not repeat an ordinary problem for every mode', () => {
		expect(problems((s) => (s.border.width.value = -1))).toEqual([
			'border.width.value: must be 0 or more',
		]);
	});
});
