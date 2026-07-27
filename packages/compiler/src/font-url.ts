import path from 'node:path';
import type { ProjectFontAssetUrlPolicy } from './project.js';

function posix(value: string): string {
	return value.split(path.sep).join('/');
}

function encodeSegment(value: string): string {
	try {
		return encodeURIComponent(decodeURIComponent(value));
	} catch {
		return encodeURIComponent(value);
	}
}

/** Encode filesystem-shaped URL paths without encoding separators or dot segments. */
export function encodeUrlPath(value: string): string {
	return posix(value)
		.split('/')
		.map((segment) =>
			segment === '' || segment === '.' || segment === '..' ? segment : encodeSegment(segment)
		)
		.join('/');
}

/** Append a real filename to a relative, public-root, or absolute URL prefix. */
export function joinUrlPath(prefix: string, filename: string): string {
	if (/^https?:\/\//i.test(prefix)) {
		const url = new URL(prefix);
		url.pathname = `${url.pathname.replace(/\/$/, '')}/${filename}`;
		return url.href;
	}
	return `${encodeUrlPath(prefix).replace(/\/$/, '')}/${encodeSegment(filename)}`;
}

export function relativeUrl(from: string, target: string): string {
	const relative = encodeUrlPath(path.relative(path.dirname(from), target));
	return relative.startsWith('.') ? relative : `./${relative}`;
}

export function validateFontAssetUrlPolicy(policy: ProjectFontAssetUrlPolicy, label: string): void {
	if (policy.mode === 'relative') return;
	if (!policy.prefix.trim()) throw new Error(`${label} ${policy.mode} prefix is required.`);
	if (/[?#]/.test(policy.prefix)) {
		throw new Error(`${label} ${policy.mode} prefix must not contain a query or fragment.`);
	}
	if (/[\u0000-\u0020\\]/.test(policy.prefix)) {
		throw new Error(
			`${label} ${policy.mode} prefix must not contain whitespace, controls, or backslashes.`
		);
	}
	if (policy.mode === 'public') {
		if (!policy.prefix.startsWith('/') || policy.prefix.startsWith('//')) {
			throw new Error(`${label} public prefix must start with / and must not start with //.`);
		}
		return;
	}
	let url: URL;
	try {
		url = new URL(policy.prefix);
	} catch {
		throw new Error(`${label} absolute prefix must be an absolute URL.`);
	}
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error(`${label} absolute prefix must use http or https.`);
	}
	if (url.username || url.password) {
		throw new Error(`${label} absolute prefix must not contain credentials.`);
	}
}

export function fontAssetUrl(
	stylesheet: string,
	fontDirectory: string,
	policy: ProjectFontAssetUrlPolicy,
	filename: string
): string {
	if (policy.mode !== 'relative') return joinUrlPath(policy.prefix, filename);
	return relativeUrl(stylesheet, path.join(fontDirectory, filename));
}
