/** Review declarations for the ratified contract, not public TFS exports. */
export type TimeValues = Readonly<Record<'min' | 'lo' | 'hi' | 'max', number>>;
export type TimeDraft = {
	readonly defaultScale: string;
	readonly scales: Readonly<
		Record<string, { readonly unit: 'ms' | 's'; readonly values: TimeValues }>
	>;
};

export type CubicBezierEasing = {
	readonly type: 'cubicBezier';
	readonly value: readonly [x1: number, y1: number, x2: number, y2: number];
};
export type LinearPoint = readonly [input: number, output: number];
export type LinearEasing = {
	readonly type: 'linear';
	readonly value: readonly LinearPoint[];
};
export type EasingValue = CubicBezierEasing | LinearEasing;
