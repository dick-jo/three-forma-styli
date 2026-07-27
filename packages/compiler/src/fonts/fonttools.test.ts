import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { createFontToolsConverter } from './fonttools.js';

describe('FontTools executable discovery', () => {
	it('explains a missing external converter before attempting font conversion', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tfs-missing-fonttools-'));
		try {
			await expect(createFontToolsConverter(path.join(root, 'fonttools'))).rejects.toThrow(
				'requires executable'
			);
		} finally {
			await fs.remove(root);
		}
	});
});
