/**
 * The contrast rule: OKLCH lightness separation between background and foreground
 * colours. This is TFS's "luminance"; it is not WCAG relative luminance or a
 * contrast ratio. Negative polarity = light text on dark; positive = dark on light.
 */
export type LuminanceRule<Color extends string = string> = {
	readonly minimumLuminanceDelta: number;
	readonly backgroundColors: readonly Color[];
	readonly foregroundColors: readonly Color[];
};

export type Polarity = 'negative' | 'positive';

export type LuminanceResult = {
	readonly metric: 'oklch-l';
	readonly deltaValid: boolean;
	readonly actualDelta: number;
	readonly requiredDelta: number;
	/** Negative polarity: backgrounds must stay at or below this. Positive: at or above. */
	readonly backgroundConstraint: number;
	readonly backgroundConstraintType: 'min' | 'max';
	readonly foregroundConstraint: number;
	readonly foregroundConstraintType: 'min' | 'max';
	/** Per colour: distance from its boundary. Positive = safe, negative = violating. */
	readonly colors: Readonly<
		Record<
			string,
			{
				readonly group: 'background' | 'foreground';
				readonly luminance: number;
				readonly headroom: number;
			}
		>
	>;
};

const stable = (value: number) => Number(value.toFixed(12));

/** Measures a palette against the rule. Pure: reports, never corrects. */
export function checkLuminance(
	colors: Readonly<Record<string, { readonly l: number }>>,
	rule: LuminanceRule,
	polarity: Polarity
): LuminanceResult {
	const negative = polarity === 'negative';
	const backgrounds = rule.backgroundColors.map((name) => colors[name]!.l);
	const foregrounds = rule.foregroundColors.map((name) => colors[name]!.l);
	const [maxBg, minBg, maxFg, minFg] = [
		Math.max(...backgrounds),
		Math.min(...backgrounds),
		Math.max(...foregrounds),
		Math.min(...foregrounds),
	];
	const delta = rule.minimumLuminanceDelta;
	const actualDelta = stable(negative ? minFg - maxBg : minBg - maxFg);
	const backgroundConstraint = stable(negative ? minFg - delta : maxFg + delta);
	const foregroundConstraint = stable(negative ? maxBg + delta : minBg - delta);

	const diagnostics: Record<string, LuminanceResult['colors'][string]> = {};
	for (const name of rule.backgroundColors) {
		const l = colors[name]!.l;
		diagnostics[name] = {
			group: 'background',
			luminance: l,
			headroom: stable(negative ? backgroundConstraint - l : l - backgroundConstraint),
		};
	}
	for (const name of rule.foregroundColors) {
		const l = colors[name]!.l;
		diagnostics[name] = {
			group: 'foreground',
			luminance: l,
			headroom: stable(negative ? l - foregroundConstraint : foregroundConstraint - l),
		};
	}
	return {
		metric: 'oklch-l',
		deltaValid: actualDelta >= delta,
		actualDelta,
		requiredDelta: delta,
		backgroundConstraint,
		backgroundConstraintType: negative ? 'max' : 'min',
		foregroundConstraint,
		foregroundConstraintType: negative ? 'min' : 'max',
		colors: diagnostics,
	};
}
