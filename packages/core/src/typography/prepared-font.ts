import type {
	PreparedFontManifestLike,
	PreparedTypographyFontOptions,
	TypographyFont,
	TypographyFontStyle,
} from '../types.js';

const categoryFallbacks = {
	sans: ['system-ui', 'sans-serif'],
	serif: ['ui-serif', 'serif'],
	mono: ['ui-monospace', 'monospace'],
} as const;

/**
 * Convert an authoritative prepared-font manifest entry into the physical font
 * capabilities consumed by typography validation. This function deliberately
 * does not invent design-system weight aliases; those belong to roles.
 */
export function fontFromManifest<
	Manifest extends PreparedFontManifestLike,
	Id extends Extract<keyof Manifest['families'], string>,
>(manifest: Manifest, id: Id, options: PreparedTypographyFontOptions = {}): TypographyFont {
	if (manifest.schemaVersion !== 2) {
		throw new Error(
			`Prepared font manifest schemaVersion ${manifest.schemaVersion} is unsupported; expected 2.`
		);
	}
	const family = manifest.families[id];
	if (!family) throw new Error(`Prepared font manifest does not contain family "${id}".`);
	const fallbacks =
		options.fallbacks ?? (options.category ? [...categoryFallbacks[options.category]] : undefined);
	if (!fallbacks?.length) {
		throw new Error(
			`Prepared font "${id}" requires options.category or a non-empty options.fallbacks stack.`
		);
	}

	const validStyles = new Set<TypographyFontStyle>(['normal', 'italic', 'oblique']);
	const descriptors = new Set<string>();
	const faces = family.faces.map((face) => {
		if (!validStyles.has(face.style as TypographyFontStyle)) {
			throw new Error(`Prepared font family "${id}" contains unsupported style "${face.style}".`);
		}
		if (
			face.obliqueAngle !== undefined &&
			(face.style !== 'oblique' ||
				!Number.isFinite(face.obliqueAngle) ||
				face.obliqueAngle <= -90 ||
				face.obliqueAngle >= 90)
		) {
			throw new Error(`Prepared font family "${id}" contains an invalid oblique angle descriptor.`);
		}
		if (face.stretch !== undefined && (typeof face.stretch !== 'number' || face.stretch !== 100)) {
			throw new Error(
				`Prepared font family "${id}" uses non-default stretch, which typography roles do not support yet.`
			);
		}
		if (face.axes?.ital || face.axes?.slnt) {
			throw new Error(
				`Prepared font family "${id}" uses a variable ital/slnt axis, which typography roles do not support yet.`
			);
		}
		const weightAxis = face.axes?.wght;
		if (
			weightAxis &&
			(typeof face.weight === 'number' ||
				face.weight.min !== weightAxis.min ||
				face.weight.max !== weightAxis.max)
		) {
			throw new Error(`Prepared font family "${id}" has inconsistent weight and wght axis ranges.`);
		}
		if (
			(typeof face.weight === 'number' &&
				(!Number.isInteger(face.weight) || face.weight < 1 || face.weight > 1000)) ||
			(typeof face.weight !== 'number' &&
				(!Number.isFinite(face.weight.min) ||
					!Number.isFinite(face.weight.max) ||
					face.weight.min < 1 ||
					face.weight.max > 1000 ||
					face.weight.min > face.weight.max))
		) {
			throw new Error(`Prepared font family "${id}" contains an invalid weight descriptor.`);
		}
		const weight =
			typeof face.weight === 'number'
				? String(face.weight)
				: `${face.weight.min}-${face.weight.max}`;
		const stretch = face.stretch === undefined ? '100' : String(face.stretch);
		const descriptor = `${face.style}:${face.obliqueAngle ?? ''}:${weight}:${stretch}`;
		if (descriptors.has(descriptor)) {
			throw new Error(
				`Prepared font family "${id}" contains duplicate face descriptor ${descriptor}.`
			);
		}
		descriptors.add(descriptor);
		return {
			style: face.style as TypographyFontStyle,
			obliqueAngle: face.obliqueAngle,
			weights: typeof face.weight === 'number' ? [face.weight] : face.weight,
			features: face.features ? [...face.features].sort() : undefined,
			axes: face.axes ? { ...face.axes } : undefined,
		};
	});

	if (faces.length === 0) {
		throw new Error(`Prepared font family "${id}" does not contain any faces.`);
	}
	for (let leftIndex = 0; leftIndex < faces.length; leftIndex++) {
		for (let rightIndex = leftIndex + 1; rightIndex < faces.length; rightIndex++) {
			const left = faces[leftIndex];
			const right = faces[rightIndex];
			if (left.style !== right.style) continue;
			const leftRange = Array.isArray(left.weights)
				? { min: Math.min(...left.weights), max: Math.max(...left.weights) }
				: left.weights;
			const rightRange = Array.isArray(right.weights)
				? { min: Math.min(...right.weights), max: Math.max(...right.weights) }
				: right.weights;
			if (leftRange.min <= rightRange.max && rightRange.min <= leftRange.max) {
				if (left.style === 'oblique' && left.obliqueAngle !== right.obliqueAngle) {
					throw new Error(
						`Prepared font family "${id}" contains multiple overlapping oblique angles, which typography roles do not expose yet.`
					);
				}
				throw new Error(
					`Prepared font family "${id}" contains overlapping ${left.style} weight faces.`
				);
			}
		}
	}

	return {
		family: family.family,
		fallbacks,
		verification: 'prepared',
		capabilities: { faces },
		diagnostics: {
			warnings: family.faces.flatMap((face) =>
				(face.warnings ?? []).map((warning) => `${face.style}: ${warning}`)
			),
		},
	};
}
