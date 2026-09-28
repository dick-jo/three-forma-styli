/** Handwritten review excerpt of generated ./tokens; no new helper API. */
export declare const tokenIdentities: readonly [
	't-min',
	't-lo',
	't-hi',
	't-max',
	't-anim-min',
	't-anim-lo',
	't-anim-hi',
	't-anim-max',
	'ease-neu',
	'ease-pri',
	'ease-duo',
	'ease-tri',
];
export type TokenIdentity = (typeof tokenIdentities)[number];
export declare function tokenReference<Token extends TokenIdentity>(
	token: Token
): `var(--${Token})`;
