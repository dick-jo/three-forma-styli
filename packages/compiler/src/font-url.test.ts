import { describe, expect, it } from 'vitest';
import { fontAssetUrl, joinUrlPath, relativeUrl, validateFontAssetUrlPolicy } from './font-url.js';

describe('generated asset URLs', () => {
	it('encodes each real path segment while preserving relative traversal', () => {
		expect(
			fontAssetUrl(
				'review pages/type # specimen.html',
				'font assets/über',
				{ mode: 'relative' },
				'Editorial #1?.woff2'
			)
		).toBe('../font%20assets/%C3%BCber/Editorial%20%231%3F.woff2');
		expect(relativeUrl('styles/main #1.css', 'tokens ?/mode.css')).toBe('../tokens%20%3F/mode.css');
	});

	it('appends an encoded filename to public and absolute prefixes', () => {
		expect(joinUrlPath('/static/design-fonts', 'Editorial #1 ü.woff2')).toBe(
			'/static/design-fonts/Editorial%20%231%20%C3%BC.woff2'
		);
		expect(joinUrlPath('/already%20encoded', 'font.woff2')).toBe('/already%20encoded/font.woff2');
		expect(joinUrlPath('https://cdn.example/fonts', 'Editorial #1?.woff2')).toBe(
			'https://cdn.example/fonts/Editorial%20%231%3F.woff2'
		);
	});

	it.each([
		[{ mode: 'public', prefix: '//cdn.example/fonts' }, 'must not start with //'],
		[{ mode: 'public', prefix: '/fonts?v=1' }, 'must not contain a query or fragment'],
		[{ mode: 'public', prefix: '/font assets' }, 'must not contain whitespace'],
		[{ mode: 'absolute', prefix: 'https://cdn.example/fonts#v1' }, 'query or fragment'],
		[{ mode: 'absolute', prefix: 'https://user:secret@cdn.example/fonts' }, 'credentials'],
		[{ mode: 'absolute', prefix: 'file:///fonts' }, 'http or https'],
	] as const)('rejects an ambiguous asset policy %#', (policy, message) => {
		expect(() => validateFontAssetUrlPolicy(policy, 'font URLs')).toThrowError(message);
	});
});
