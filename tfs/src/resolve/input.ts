/**
 * The assembled system as plain data, as the resolver receives it at runtime.
 * Authoring types (define/) are stricter; these accept anything so every problem
 * can be reported with its path instead of crashing.
 */
import type { Oklch } from '../define/color.js';

export type Modes<Fields> = Readonly<Record<string, Readonly<Record<string, Fields>>>>;

export type AlphaValues = Readonly<Record<string, number>>;
export type SpacingRef = 'min' | number;
export type Layer = {
	readonly x: number;
	readonly y: number;
	readonly blur: number;
	readonly spread?: number;
	readonly inset?: boolean;
	readonly color: { readonly color: string; readonly alpha?: string };
};
export type LayerRange = Readonly<Record<string, readonly Layer[]>>;
export type Easing =
	| { readonly type: 'cubicBezier'; readonly value: readonly number[] }
	| { readonly type: 'linear'; readonly value: readonly (readonly number[])[] };

export type SizeRow = {
	readonly fontSize: SpacingRef;
	readonly weight?: string;
	readonly lineHeight: number;
	readonly letterSpacing: number;
};

export type RoleInput = {
	readonly font: string;
	readonly textTransform?: string;
	readonly styles?: readonly string[];
	readonly weights: number | Readonly<Record<string, number>>;
	readonly sizes: Readonly<Record<string, SizeRow>>;
	readonly modes?: Modes<{ readonly sizes?: Readonly<Record<string, Partial<SizeRow>>> }>;
};

export type FontInput =
	| {
			readonly files: readonly string[];
			readonly category: string;
			readonly name?: string;
			readonly display?: string;
	  }
	| { readonly name: string; readonly fallbacks: readonly string[]; readonly files?: undefined };

export type SystemInput = {
	readonly axes: Readonly<
		Record<
			string,
			{ readonly modes: readonly string[]; readonly activation: { readonly attribute: string } }
		>
	>;
	readonly alpha?: {
		readonly values: AlphaValues;
		readonly scales?: Readonly<Record<string, { values: AlphaValues }>>;
	};
	readonly colors?: {
		readonly tokens: Readonly<Record<string, Oklch>>;
		readonly polarity?: string;
		readonly groups?: Readonly<
			Record<
				string,
				{ readonly identities: readonly string[] } | { readonly match: { readonly prefix: string } }
			>
		>;
		readonly constraints?: {
			readonly luminance?: {
				readonly minimumLuminanceDelta: number;
				readonly backgroundColors: readonly string[];
				readonly foregroundColors: readonly string[];
			};
		};
		readonly modes?: Modes<{
			readonly tokens?: Readonly<Record<string, Oklch>>;
			readonly polarity?: string;
		}>;
	};
	readonly spacing?: {
		readonly unit: string;
		readonly min: number;
		readonly step: number;
		readonly count: number;
		readonly modes?: Modes<{ readonly min?: number; readonly step?: number }>;
	};
	readonly gap?: Readonly<Record<string, SpacingRef>> & {
		readonly modes?: Modes<Readonly<Record<string, SpacingRef>>>;
	};
	readonly border?: {
		readonly radius: Readonly<Record<string, SpacingRef>> & {
			readonly modes?: Modes<Readonly<Record<string, SpacingRef>>>;
		};
		readonly width: {
			readonly unit: string;
			readonly value: number;
			readonly modes?: Modes<{ readonly value?: number }>;
		};
	};
	readonly shadows?: Readonly<Record<string, unknown>> & {
		readonly unit: string;
		readonly ranges?: Readonly<Record<string, LayerRange>>;
		readonly modes?: Modes<Readonly<Record<string, unknown>>>;
	};
	readonly time?: {
		readonly unit: string;
		readonly values: Readonly<Record<string, number>>;
		readonly scales?: Readonly<
			Record<string, { readonly unit: string; readonly values: Readonly<Record<string, number>> }>
		>;
	};
	readonly easings?: Readonly<Record<string, Easing>>;
	readonly fontSize?: {
		readonly unit: string;
		readonly min: number;
		readonly start: number;
		readonly step: number;
		readonly count: number;
		readonly modes?: Modes<{
			readonly unit?: string;
			readonly min?: number;
			readonly start?: number;
			readonly step?: number;
		}>;
	};
	readonly typography?: {
		readonly fonts: Readonly<Record<string, FontInput>>;
		readonly roles: Readonly<Record<string, RoleInput>>;
	};
};
