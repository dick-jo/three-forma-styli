import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emitTokensCss, resolveSystem, type SystemInput } from 'three-forma-styli';
import config from './fixtures/everything/tfs.config.js';

// Real-browser proof that tokens.css resolves correctly in nested and combined modes.
const css = emitTokensCss(resolveSystem(config.system as unknown as SystemInput));

const page = `
<style>${css}</style>
<div id="root"></div>
<div data-size-mode="s"><div id="s"></div>
	<div data-size-mode="regular"><div id="s-regular"></div></div>
	<div data-theme-mode="light"><div id="s-then-light"></div></div>
</div>
<div data-theme-mode="light"><div id="light"></div>
	<div data-size-mode="s"><div id="light-then-s"></div></div>
	<div data-theme-mode="dark"><div id="light-dark"></div></div>
</div>
<div data-theme-mode="light" data-size-mode="s"><div id="both"></div></div>
<div data-size-mode="s"><div data-size-mode="regular"><div data-theme-mode="light"><div id="s-regular-light"></div></div></div></div>
<div data-size-mode="regular"><div data-size-mode="s"><div data-theme-mode="light"><div id="regular-s-light"></div></div></div></div>
<div data-size-mode="s"><div data-size-mode="regular"><div data-theme-mode="light" data-size-mode="s"><div id="s-regular-both"></div></div></div></div>
`;

const DARK_SHD = 'oklch(0.06 0 0 / 0.25)';
const LIGHT_SHD = 'oklch(0.2 0 0 / 0.25)';
const ORDINARY_MAX = (c: string) => `0px 3px 6px ${c}, 0px 20px 48px -8px ${c}`;
const SMALL_MAX = (c: string) => `0px 2px 4px ${c}, 0px 12px 32px -6px ${c}`;

let browser: Browser;
let tab: Page;
const read = (id: string, name: string) =>
	tab.$eval(
		`#${id}`,
		(element, property) => getComputedStyle(element).getPropertyValue(property).trim(),
		`--${name}`
	);

beforeAll(async () => {
	browser = await chromium.launch();
	tab = await browser.newPage();
	await tab.setContent(page);
});
afterAll(() => browser?.close());

describe('tokens.css in a browser', () => {
	it('ordinary values at the root', async () => {
		expect(await read('root', 'sp-1')).toBe('8px');
		expect(await read('root', 'gap-s')).toBe('8px');
		expect(await read('root', 'shd-max')).toBe(ORDINARY_MAX(DARK_SHD));
	});

	it('references follow a mode (gap follows spacing)', async () => {
		expect(await read('s', 'gap-s')).toBe('6px');
		expect(await read('s', 'bdr-max')).toBe('18px');
	});

	it('a mode with no changes restores ordinary values inside another mode', async () => {
		expect(await read('s-regular', 'gap-s')).toBe('8px');
		expect(await read('light-dark', 'clr-pri')).toBe('oklch(0.7 0.16 285)');
		expect(await read('light-dark', 'shd-lo')).toContain(DARK_SHD);
	});

	it('shadow colour follows theme', async () => {
		expect(await read('light', 'shd-max')).toBe(ORDINARY_MAX(LIGHT_SHD));
		expect(await read('light', 'shd-glow-pri-lo')).toBe(
			'0px 0px 12px oklch(0.45 0.18 285 / 0.125)'
		);
	});

	it('shadow shape follows size while colour follows theme, however they are nested', async () => {
		expect(await read('s-then-light', 'shd-max')).toBe(SMALL_MAX(LIGHT_SHD));
		expect(await read('light-then-s', 'shd-max')).toBe(SMALL_MAX(LIGHT_SHD));
		expect(await read('both', 'shd-max')).toBe(SMALL_MAX(LIGHT_SHD));
	});

	it('the nearest size mode wins when size is re-nested', async () => {
		expect(await read('s-regular-light', 'shd-max')).toBe(ORDINARY_MAX(LIGHT_SHD));
		expect(await read('regular-s-light', 'shd-max')).toBe(SMALL_MAX(LIGHT_SHD));
		expect(await read('s-regular-both', 'shd-max')).toBe(SMALL_MAX(LIGHT_SHD));
	});

	it('font sizes follow size', async () => {
		expect(await read('both', 'fs-1')).toBe('0.6875rem');
		expect(await read('light', 'fs-1')).toBe('0.75rem');
	});
});
