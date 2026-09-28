# Time and Easing authoring contract

Status: ratified on 2026-09-09; implementation remains pending. The Founder Board
records the governing product verdict. This document specifies the accepted
Time shape, two Easing forms, and small helper contract. The later simplicity
verdict removes Steps from the earlier proposal. Numerical values below remain
illustrative, pending standard-theme calibration.

The [representative confirmation mock](./blueprints/time-easing/README.md), prepared
2026-09-28, shows separate authored files, complete CSS output, and CSS/TypeScript
consumer examples. Both representative reviews are complete. The founder
reconfirmed Time's named scales and `defaultScale` for consistency with Alpha;
the alternative prefixless ordinary source shape was declined. The contract below
is unchanged.

The project remains in the
[blueprint and ratification milestone](./founder-board.md#overhaul-milestones).
Acceptance of this contract does not start development: the broader blueprint
comes first, followed by architecture/triage and an agreed implementation runbook,
then reviewable implementation increments.

## Two small constructors

| Helper                        | Meaning                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `cubicBezier(x1, y1, x2, y2)` | The conventional four Bézier coordinates                       |
| `linear()`                    | Constant-speed progress                                        |
| `linear(points)`              | Explicit `[input, output]` points, joined by straight segments |

These are ordinary authoring functions returning plain typed data. They do not
return animation callbacks, require classes, or introduce another identity layer.
Direct object authoring produces the same result.

## Common value shape

Every definition uses `{ type, value }`. The discriminator identifies how to
validate, inspect, edit, and serialize its value.

```ts
type CubicBezierEasing = Readonly<{
	type: 'cubicBezier';
	value: readonly [x1: number, y1: number, x2: number, y2: number];
}>;

type LinearPoint = readonly [input: number, output: number];

type LinearEasing = Readonly<{
	type: 'linear';
	value: readonly LinearPoint[];
}>;

type EasingValue = CubicBezierEasing | LinearEasing;
```

The accepted public helper signatures are:

```ts
declare function cubicBezier(x1: number, y1: number, x2: number, y2: number): CubicBezierEasing;

declare function linear(): LinearEasing;
declare function linear(points: readonly LinearPoint[]): LinearEasing;
```

## Bézier coordinates

All four coordinates must be finite; `x1` and `x2` must be within `0…1`.
The y coordinates may exceed that interval to allow anticipation or overshoot.
The endpoints are the conventional fixed `(0, 0)` and `(1, 1)`.

For example:

```ts
cubicBezier(0.2, 0, 0.38, 0.9);
// { type: 'cubicBezier', value: [0.2, 0, 0.38, 0.9] }
```

This emits `cubic-bezier(0.2, 0, 0.38, 0.9)`. The Workbench can expose the four
coordinates as labelled controls and movable handles.

## Linear points

Each pair is `[input, output]`, the usual graph order: time progress first,
resulting progress second. `0.5` input means halfway through the selected
duration. It becomes `50%` when serialized to CSS; no duration or time unit is
stored in the easing.

```ts
linear([
	[0, 0],
	[0.4, 1],
	[0.6, 0.8],
	[0.8, 1],
	[1, 1],
]);
```

This illustrative curve reaches its destination at 40%, retreats, then returns.
It emits `linear(0 0%, 1 40%, 0.8 60%, 1 80%, 1 100%)`. It is an example of
the coordinate format, not a calibrated stock bounce.

Validation and serialization rules:

- Explicit lists require at least two points, each containing two finite numbers.
- Inputs must be nondecreasing. Equal inputs are allowed for discontinuities.
  Reject descending inputs instead of sorting or silently changing them.
- Input and output coordinates are unitless. Inputs ordinarily span `0…1`, but
  finite values outside that interval remain valid; output values may also
  overshoot. Do not force endpoints to `(0, 0)` and `(1, 1)` for custom curves.
- Every input is explicit. Do not add CSS's omitted-position or double-position
  shorthand to the structured authoring format; repeated points express those
  results directly.
- `linear()` returns `{ type: 'linear', value: [[0, 0], [1, 1]] }`. This exact
  identity curve serializes as the CSS keyword `linear`. An explicit empty list
  is invalid, rather than another spelling of the no-argument helper.

The explicit nondecreasing list is a TFS authoring choice. CSS itself normalizes
descending input positions; TFS accepts the resolved coordinate form so authored
mistakes do not silently move points. The interpolation and discontinuity
semantics still follow [CSS Linear easing](https://www.w3.org/TR/css-easing-2/#linear-easing-function).

## Complete everyday authoring example

This is a project configuration fragment. Helper exports do not exist yet.
The optional `anim` scale demonstrates extension; the two Easing identities are
ordinary Béziers, matching the founder's main use case.

```ts
const foundations = {
	time: {
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
	},
	easings: {
		neu: cubicBezier(0.2, 0, 0.38, 0.9),
		pri: cubicBezier(0.34, 1.56, 0.64, 1),
	},
};
```

The resulting names are `--t-min / --t-lo / --t-hi / --t-max`, their additional
`--t-anim-*` counterparts, and `--ease-neu / --ease-pri`. Using a Time token as a
delay does not require another authored definition.

Where a project needs constant-speed easing, an identity can directly own it:

```ts
const additionalEasings = {
	duo: linear(),
};
```

This assignment is an example, not a mandatory standard-theme meaning for
`duo`. A project can choose different values or custom identities.

## Review and implementation boundary

The constructor/data contract above is accepted. Numerical theme calibration
remains separate. Steps has no TFS value type, helper, or Workbench control;
authors can use CSS `steps()` directly for local needs such as sprite animation.

Implementation must carry the same values through CSS, TypeScript, Workbench
controls and review patches. It should reject malformed direct objects as well
as malformed helper inputs. Figma supports its useful subset and reports
unavailable exports in the adapter.

This contract does not ratify Motion composites or their historical
`base`/variant shape. The later Founder Board verdict parks Motion composites
for this overhaul. Shadow grammar remains a separate blueprint workshop topic.
