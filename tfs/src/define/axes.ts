/**
 * Axes, modes and the project registration that lets every define…() check
 * names from other files. Register once in tfs.config.ts:
 *
 *   declare module 'three-forma-styli' {
 *     interface Register { axes: typeof axes; colors: typeof colors }
 *   }
 */

export interface Register {}

export type AxisCatalogue = Readonly<
	Record<
		string,
		{
			readonly modes: readonly [string, ...string[]];
			readonly activation: { readonly attribute: string };
		}
	>
>;

/** The project's axes once registered; any axis/mode names before that. */
export type Axes = Register extends { readonly axes: infer A extends AxisCatalogue }
	? A
	: AxisCatalogue;

/** Named mode entries supply only changes. */
export type ModeCatalogue<Fields> = {
	readonly [Axis in keyof Axes]?: {
		readonly [Mode in Axes[Axis]['modes'][number]]?: Fields;
	};
};

/** Rejects axis or mode names that axes.ts does not register. */
export type ModesCheck<T> = T extends { readonly modes: infer M }
	? {
			readonly modes: {
				readonly [A in keyof M]: A extends keyof Axes
					? {
							readonly [Mode in keyof M[A]]: Mode extends Axes[A]['modes'][number]
								? M[A][Mode]
								: never;
						}
					: never;
			};
		}
	: unknown;

export function defineAxes<const T extends AxisCatalogue>(axes: T): T {
	return axes;
}
