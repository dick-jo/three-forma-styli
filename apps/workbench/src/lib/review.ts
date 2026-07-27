import type {
	ColorReviewCase,
	ReviewControl,
	ReviewModeGroup,
	ShadowReviewCase,
	TypographyReviewCase,
} from '@three-forma-styli/core';
import type { DraftValues } from './draft';

const genericFamilies = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
	'ui-serif',
	'ui-sans-serif',
	'ui-monospace',
	'ui-rounded',
	'emoji',
	'math',
	'fangsong',
]);

function cssFamily(value: string): string {
	return genericFamilies.has(value.toLowerCase()) ? value : JSON.stringify(value);
}

export function controlValue(control: ReviewControl, draft: DraftValues): string | number {
	const value = draft[control.path];
	return typeof value === 'string' || typeof value === 'number' ? value : control.value;
}

export function colorStyle(reviewCase: ColorReviewCase, draft: DraftValues, alpha = 1): string {
	const values = Object.fromEntries(
		reviewCase.controls.map((control) => [control.id, Number(controlValue(control, draft))])
	);
	const l = values.l ?? reviewCase.value.l;
	const c = values.c ?? reviewCase.value.c;
	const h = values.h ?? reviewCase.value.h;
	return `oklch(${l} ${c} ${h}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

export function canvasVariables(
	modeGroups: ReviewModeGroup[],
	colorMode: string,
	sizeMode: string
): string {
	const selected = [
		modeGroups
			.find((group) => group.category === 'color')
			?.modes.find((mode) => mode.name === colorMode),
		modeGroups
			.find((group) => group.category === 'size')
			?.modes.find((mode) => mode.name === sizeMode),
	];
	return selected
		.flatMap((mode) => Object.entries(mode?.tokens ?? {}))
		.map(([name, value]) => `${name}:${value}`)
		.join(';');
}

export function typographyStyle(
	reviewCase: TypographyReviewCase,
	draft: DraftValues,
	options: { forceFallback?: boolean; wcagSpacing?: boolean } = {}
): string {
	const values = Object.fromEntries(
		reviewCase.controls.map((control) => [control.id, controlValue(control, draft)])
	);
	const sizeControl = reviewCase.controls.find(
		(control) => control.kind === 'select' && control.id === 'fontSize'
	);
	const sizeOption =
		sizeControl?.kind === 'select'
			? sizeControl.options.find((option) => option.value === values.fontSize)
			: undefined;
	const weight =
		reviewCase.availableWeights.find((entry) => entry.alias === values.weight)?.value ??
		reviewCase.weight.value;
	const primaryStack = [
		reviewCase.font.family,
		...(reviewCase.font.adjustedFallback ? [reviewCase.font.adjustedFallback] : []),
		...reviewCase.font.fallbacks,
	];
	const fallbackStack = [
		...(reviewCase.font.adjustedFallback ? [reviewCase.font.adjustedFallback] : []),
		...reviewCase.font.fallbacks,
	];
	return [
		`font-family:${(options.forceFallback ? fallbackStack : primaryStack)
			.map(cssFamily)
			.join(',')}`,
		`font-size:${sizeOption?.css ?? `var(--${reviewCase.recipe.atomicFontSizeToken})`}`,
		`font-style:${reviewCase.style}`,
		`font-weight:${weight}`,
		'font-synthesis:none',
		`line-height:${options.wcagSpacing ? 1.5 : values.lineHeight}`,
		`letter-spacing:${
			options.wcagSpacing
				? '0.12em'
				: values.letterSpacing === 0
					? '0'
					: `${values.letterSpacing}em`
		}`,
		...(options.wcagSpacing ? ['word-spacing:0.16em'] : []),
		`text-transform:${reviewCase.recipe.textTransform ?? 'none'}`,
		...(reviewCase.recipe.fontKerningToken
			? [`font-kerning:var(--${reviewCase.recipe.fontKerningToken})`]
			: []),
		...(reviewCase.recipe.fontOpticalSizingToken
			? [`font-optical-sizing:var(--${reviewCase.recipe.fontOpticalSizingToken})`]
			: []),
		...(reviewCase.recipe.fontFeatureSettingsToken
			? [`font-feature-settings:var(--${reviewCase.recipe.fontFeatureSettingsToken})`]
			: []),
		...(reviewCase.recipe.fontVariationSettingsToken
			? [`font-variation-settings:var(--${reviewCase.recipe.fontVariationSettingsToken})`]
			: []),
	].join(';');
}

export function shadowStyle(reviewCase: ShadowReviewCase, draft: DraftValues): string {
	const controls = Object.fromEntries(
		reviewCase.controls.map((control) => [control.id, Number(controlValue(control, draft))])
	);
	const css = reviewCase.layers
		.map((layer, index) => {
			const prefix = `layer-${index}`;
			const x = controls[`${prefix}-x`] ?? layer.x;
			const y = controls[`${prefix}-y`] ?? layer.y;
			const blur = controls[`${prefix}-blur`] ?? layer.blur;
			const spread =
				reviewCase.shadowKind === 'box'
					? (controls[`${prefix}-spread`] ?? layer.spread ?? 0)
					: undefined;
			return [
				layer.inset ? 'inset' : '',
				`${x}${reviewCase.unit}`,
				`${y}${reviewCase.unit}`,
				`${blur}${reviewCase.unit}`,
				spread === undefined ? '' : `${spread}${reviewCase.unit}`,
				layer.color.css,
			]
				.filter(Boolean)
				.join(' ');
		})
		.join(', ');
	return `${reviewCase.shadowKind === 'box' ? 'box-shadow' : 'text-shadow'}:${css}`;
}
