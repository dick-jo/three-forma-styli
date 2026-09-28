import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vocabulary from the pre-v0.5 implementation that must not creep back in.
const BANNED = [
	'isDefault',
	'defaultScale',
	'defaultRange',
	'modeOverrides',
	'variants',
	'license',
	'verification',
	'strategy',
	'increment',
	'displayOrder',
	'defaultStyle',
	'tfsSystem',
	'shadow--',
	'dtcg',
];

const root = new URL('../src/', import.meta.url).pathname;

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}

describe('no old vocabulary in src/', () => {
	for (const word of BANNED) {
		it(word, () => {
			const hits = files(root).filter((file) => readFileSync(file, 'utf8').includes(word));
			expect(hits).toEqual([]);
		});
	}
});
