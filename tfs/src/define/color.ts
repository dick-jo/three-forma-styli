import type { ModeCatalogue } from './axes.js';

/** Structural OKLCH colour; no colour-library types required. */
export type Oklch = {
	readonly mode: 'oklch';
	readonly l: number;
	readonly c: number;
	readonly h: number;
};

export function oklch(l: number, c: number, h: number): Oklch {
	return { mode: 'oklch', l, c, h };
}

// ---- Alpha ----

export const ALPHA_POSITIONS = ['min', 'lo-x', 'lo', 'hi', 'hi-x', 'max'] as const;

type AlphaValues = Readonly<Record<(typeof ALPHA_POSITIONS)[number], number>>;

/** `non` is the fixed zero below every scale. */
export type AlphaPosition = 'non' | (typeof ALPHA_POSITIONS)[number];

/** Ordinary scale unnamed at the top (--a-*); named extras in `scales` (--a-{name}-*). */
export type AlphaDraft = {
	readonly values: AlphaValues;
	readonly scales?: Readonly<Record<string, { readonly values: AlphaValues }>>;
};

export function defineAlpha<const T extends AlphaDraft>(alpha: T): T {
	return alpha;
}

/** Even steps from `min` (or max/6) to `max`. Authoring sugar; returns plain values. */
export function deriveAlphaScale(input: { distribution: 'linear'; min?: number; max: number }): {
	values: AlphaValues;
} {
	const count = ALPHA_POSITIONS.length;
	const start = input.min ?? input.max / count;
	const step = input.min === undefined ? start : (input.max - start) / (count - 1);
	const values = Object.fromEntries(
		ALPHA_POSITIONS.map((position, index) => [position, Number((start + step * index).toFixed(6))])
	) as unknown as AlphaValues;
	return { values };
}

// ---- Colours ----

type Polarity = 'negative' | 'positive';

export type ColorDraft<Tokens extends Record<string, Oklch>> = {
	readonly tokens: Tokens;
	readonly polarity?: Polarity;
	readonly groups?: Readonly<
		Record<
			string,
			| { readonly identities: readonly (keyof Tokens)[] }
			| { readonly match: { readonly prefix: string } }
		>
	>;
	readonly constraints?: {
		readonly luminance?: {
			readonly minimumLuminanceDelta: number;
			readonly backgroundColors: readonly (keyof Tokens)[];
			readonly foregroundColors: readonly (keyof Tokens)[];
		};
	};
	readonly modes?: ModeCatalogue<{
		readonly tokens?: Partial<Record<keyof Tokens, Oklch>>;
		readonly polarity?: Polarity;
	}>;
};

export type ColorIdentity<Colors> = Colors extends { readonly tokens: infer T }
	? Extract<keyof T, string>
	: never;

type Names<C> = C extends { readonly tokens: infer T } ? keyof T : never;
type OnlyNames<List, C> = {
	readonly [I in keyof List]: List[I] extends Names<C> ? List[I] : never;
};

/** Checks names used inside the palette (groups, rule, mode changes) against its tokens. */
type ColorCheck<C> = {
	readonly groups?: C extends { readonly groups: infer G }
		? {
				readonly [K in keyof G]: G[K] extends { readonly identities: infer L }
					? { readonly identities: OnlyNames<L, C> }
					: G[K];
			}
		: never;
	readonly constraints?: C extends { readonly constraints: { readonly luminance: infer L } }
		? {
				readonly luminance: {
					readonly [K in keyof L]: K extends 'backgroundColors' | 'foregroundColors'
						? OnlyNames<L[K], C>
						: L[K];
				};
			}
		: never;
	readonly modes?: C extends { readonly modes: infer M }
		? {
				readonly [A in keyof M]: {
					readonly [Mode in keyof M[A]]: M[A][Mode] extends { readonly tokens: infer T }
						? Omit<M[A][Mode], 'tokens'> & {
								readonly tokens: { readonly [K in keyof T]: K extends Names<C> ? Oklch : never };
							}
						: M[A][Mode];
				};
			}
		: never;
};

export function defineColors<const C extends ColorDraft<Record<string, Oklch>>>(
	colors: C & ColorCheck<C>
): C {
	return colors;
}
