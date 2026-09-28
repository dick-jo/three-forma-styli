import { expect, it } from 'vitest';
import { axes, colorGroups, colors, cssVar } from './fixtures/everything/expected/tokens.js';

it('./tokens exposes the real names at runtime', () => {
	expect(colors).toEqual(['bg', 'ev', 'ink', 'neu', 'pri', 'duo', 'shd']);
	expect(colorGroups).toEqual({ accents: ['pri', 'duo'] });
	expect(axes.size).toEqual({ attribute: 'data-size-mode', modes: ['regular', 's', 'l'] });
	expect(cssVar('clr-pri-a-lo')).toBe('var(--clr-pri-a-lo)');
});

it('prefix groups are written out as exact lists, not string', async () => {
	const { emitTokensTypes, resolveSystem, oklch } = await import('three-forma-styli');
	const { fonts, system } = await import('./everything.js');
	const copy = structuredClone(system) as any;
	copy.colors.tokens['net-base'] = oklch(0.6, 0.16, 250);
	copy.colors.tokens['net-op'] = oklch(0.6, 0.18, 25);
	copy.colors.groups.networks = { match: { prefix: 'net-' } };
	expect(emitTokensTypes(resolveSystem(copy), fonts.stacks)).toContain(
		'readonly "networks": readonly ["net-base", "net-op"];'
	);
});
