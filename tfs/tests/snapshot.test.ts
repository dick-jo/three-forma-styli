import { expect, it } from 'vitest';
import { emitTokensCss, resolveSystem, type SystemInput } from 'three-forma-styli';
import config from './fixtures/everything/tfs.config.js';

// The full generated output, committed so every change to it is a readable diff.
it('tokens.css', async () => {
	const css = emitTokensCss(resolveSystem(config.system as unknown as SystemInput));
	await expect(css).toMatchFileSnapshot('./fixtures/everything/expected/tokens.css');
});
