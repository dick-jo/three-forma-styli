# Time and Easing confirmation mock

Status, 2026-09-28: **ratified contracts represented in a complete mock; ready for review**.
This is milestone 1. The [authoring contract](../../v05-time-easing-contract.md)
and [Founder Board](../../founder-board.md#time) govern the shape. The current
production Time generator still uses numbered multiples, and Easing is still
inside old Motion code. This mock does not implement their replacement.

## Authoring

Read [time.ts](./time.ts) and [easing.ts](./easing.ts). Each main declaration starts
immediately after its imports. There are no intermediate preset registries.

```ts
export const time = {
	defaultScale: 'neu',
	scales: {
		neu: {
			unit: 'ms',
			values: { min: 50, lo: 100, hi: 200, max: 400 },
		},
		anim: {
			unit: 'ms',
			values: { min: 500, lo: 1000, hi: 2000, max: 4000 },
		},
	},
};
```

Both scales are available simultaneously. `defaultScale` chooses the short names;
it neither chooses a theme mode nor generates an unsuffixed `--t`. Remove `anim`
when it is not needed. All four positions are authored explicitly and increase;
there is no numbered Time scale or multiplication input in the new contract.
The same values can be durations or delays. [alternatives.ts](./alternatives.ts)
shows equivalent seconds rather than milliseconds.

```ts
export const easings = {
	neu: cubicBezier(0.2, 0, 0.38, 0.9),
	pri: cubicBezier(0.34, 1.56, 0.64, 1),
	duo: linear(),
	tri: linear([
		[0, 0],
		[0.4, 1],
		[0.6, 0.8],
		[0.8, 1],
		[0.9, 0.95],
		[1, 1],
	]),
};
```

| Identity | This example's authored choice                                        |
| -------- | --------------------------------------------------------------------- |
| `neu`    | Ordinary Bézier easing                                                |
| `pri`    | A Bézier with overshoot                                               |
| `duo`    | Constant-speed progress                                               |
| `tri`    | Explicit points that reach the destination, retreat twice, and settle |

These meanings are chosen by the author. `pri` can instead directly contain the
Linear bounce; the name does not bind it to a type or a stock preset. The four
entries demonstrate supported cases, not a requirement to author four easings.
Standard-theme identity vocabulary remains `neu / pri / duo / tri / tet / pen`;
custom identities are allowed. There is no `--ease-default` or unsuffixed alias.

The helpers return data. For example, `neu` becomes:

```ts
{ type: 'cubicBezier', value: [0.2, 0, 0.38, 0.9] }
```

The Workbench can edit those coordinates; CSS strings are output. Direct object
authoring is equivalent. The local helper import is a declaration-only review
stand-in, not a package authors will need to maintain or an implemented TFS export.

For Linear points, `[0.6, 0.8]` means 80% progress at 60% of the duration. CSS
writes output first, so this emits `0.8 60%`. The example's sparse points are
deliberately readable, not a calibrated stock bounce. Bézier overshoot and a
repeated bounce remain different choices. The underlying forms follow
[CSS Easing](https://www.w3.org/TR/css-easing-2/).

The existing contract permits repeated Linear inputs for jumps and finite inputs
outside 0…1; output values may overshoot. Bézier x coordinates stay within 0…1,
while y coordinates can overshoot. These rules are already settled, not new
workshop questions. Steps, physics parameters, and a preset registry remain out
of scope. No easing dependency is required for the accepted constructors and output.

## Output and consumption

[expected-tokens.css](./expected-tokens.css) shows all **12 variables**: eight
Time values and four Easings. It is an explicit review expansion, not current
compiler output. No `--t-neu-*` duplicates, base position, or delay family is emitted.

[consumer.css](./consumer.css) demonstrates a 200ms transition with a 50ms delay,
using `pri`, and a four-second repeating animation using the longer scale and
constant-speed `duo`. Animation properties and keyframes belong to the component.
Application motion preferences remain the application's responsibility; this
example adds no TFS mode or automatic reduced-motion behaviour.

[consumer.ts](./consumer.ts) uses the existing generated `tokenReference` helper:

```ts
const transitionStyle = {
	transitionDuration: tokenReference('t-hi'),
	transitionDelay: tokenReference('t-min'),
	transitionTimingFunction: tokenReference('ease-pri'),
};
```

The supporting declaration is a handwritten excerpt of the intended generated
`./tokens` catalogue. Real consumers import their generated module. It retains
exact token names without importing authoring helpers or a numerical easing engine.

## What remains to review?

The product rules are already ratified. Confirm that the files and output make
the intended ordinary authoring and optional longer/bounce cases clear. No new
Axis participation or Motion composite is proposed. Standard-theme calibration
and Workbench controls belong to later implementation/review, not this approval.
CSS and TypeScript are the primary outputs; useful Figma conversions remain an
adapter concern and may report unsupported exports.

Once the example is accepted, move to Typography. Motion composites stay deferred.

## Verification boundary

The TypeScript check covers the authoring shapes and consumer token names. The
bounded probe supplies data-packing stubs for the declaration-only helpers,
expands only this fixture, compares all 12 values to the expected CSS, and checks
the seconds/direct-object alternatives. Headless Chromium parses the easing
values and checks the consumer's computed duration, delay and easing. This is
input/output evidence, not a new production validator, generator, public helper,
Workbench editor, or visual calibration review.

```sh
pnpm exec tsc -p docs/blueprints/time-easing/tsconfig.json
node docs/blueprints/time-easing/verify.mjs
```
