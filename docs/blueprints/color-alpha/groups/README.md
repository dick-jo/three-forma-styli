# Color Groups: authoring and resolved members

Status, 2026-09-24: **representative companion ready for founder review**.
Milestone 1 only. This illustrates the existing Group contract; no new selector
language, helper API, or production implementation is introduced.

```text
groups/
  color.ts            Four swatches and two ways to select identities
  shadow.ts           Use the explicit selection directly in the Shadow declaration
  expected-groups.ts  Exact resolved lists and consumer types
```

## Input and output

The ordinary palette declares `neu`, `pri`, `network-base`, and
`network-optimism`. Its Groups are:

```ts
groups: {
  glow: { identities: ['pri', 'neu'] },
  network: { match: { prefix: 'network-' } },
}
```

The generated `./tokens` contract exposes the resolved lists:

```ts
colorGroups.glow; // ['pri', 'neu']
colorGroups.network; // ['network-base', 'network-optimism']
```

An explicit list preserves the author's order. Prefix matching preserves palette
declaration order; it does not sort alphabetically. The trailing hyphen matters:
`network-` matches `network-base`, but not `networking`. Matching is case-sensitive.

Add a `network-new` swatch and it joins `network` on the next build. It does not
join `glow`: that list changes only when the author changes it. A swatch can belong
to multiple Groups, and a palette does not need to group every swatch.

The lists contain **Color identities**, never CSS variable names or Alpha
positions. Groups live alongside the complete ordinary palette. Changing a
swatch's value in a mode does not change membership.

## Use a Group while authoring

The [Shadow companion](./shadow.ts) keeps the helper inline:

```ts
...shadowsForColors({
  prefix: 'glow',
  colors: colors.groups.glow.identities,
  range: {
    min: [{ x: 0, y: 0, blur: 4, alpha: 'min' }],
    lo: [{ x: 0, y: 0, blur: 8, alpha: 'lo-x' }],
    hi: [{ x: 0, y: 0, blur: 16, alpha: 'lo' }],
    max: [{ x: 0, y: 0, blur: 32, alpha: 'hi' }],
  },
})
```

This produces two Shadow ranges, with these eight expected variables:

```text
--shd-glow-pri-min   --shd-glow-neu-min
--shd-glow-pri-lo    --shd-glow-neu-lo
--shd-glow-pri-hi    --shd-glow-neu-hi
--shd-glow-pri-max   --shd-glow-neu-max
```

For example, `--shd-glow-pri-lo` means
`0px 0px 8px var(--clr-pri-a-lo-x)`. The unit comes from `shadows.unit`.
There is no unsuffixed Shadow token. The Group itself generates no shadows:
the author's helper call requests them. Renaming the Group to `highlights` and
updating that reference would leave the output unchanged while `prefix: 'glow'`
stays the same.

The Shadow helper is ratified but not implemented. This file reuses the existing
declaration-only Shadow mock for editor checking; the eight Shadow variables above
are expected blueprint output, not verified compiler output.

**For a prefix Group**, the authored object has a matcher, not an `identities`
array. Today's existing core utility can resolve it when an author needs the list:

```ts
resolveIdentityGroups(Object.keys(colors.tokens), colors.groups).network;
// ['network-base', 'network-optimism']
```

That utility returns ordinary string arrays; it currently does not preserve exact
member types for the proposed Shadow helper. Generated consumer contracts do
preserve them. This is a bounded authoring ergonomics gap for later API/architecture
triage if prefix selections need to feed helpers; do not solve it with a type cast
or an import from the generated consumer package. The explicit Group example
above already passes its exact authored tuple directly.

## Use a Group in an application

An application imports `colorGroups` and `colorReference` from its generated
`./tokens` entry. A picker can iterate the list without repeating the palette:

```ts
const choices = colorGroups.network.map((identity) => ({
	value: identity,
	color: colorReference(identity),
}));
```

Expected result:

```ts
[
	{ value: 'network-base', color: 'var(--clr-network-base)' },
	{ value: 'network-optimism', color: 'var(--clr-network-optimism)' },
];
```

`ColorIdentityIn<'network'>` is exactly
`'network-base' | 'network-optimism'`. A consumer can restrict a picker or component
to that subset. The Group name has no built-in meaning to TFS.

The Color variables still use their ordinary names, such as `--clr-pri` and
`--clr-network-base`, plus their existing Alpha variants. There is no
`--clr-glow-pri` alias and no additional Color token for Group membership.

## Existing validation

| Input                                            | Result                                    |
| ------------------------------------------------ | ----------------------------------------- |
| An explicit list names `missing`                 | Reject: unknown Color identity            |
| An explicit list is empty or repeats an identity | Reject: list must be non-empty and unique |
| A prefix matches no identities                   | Reject: matcher has no members            |
| A Group declares both `identities` and `match`   | Reject: choose one selection method       |
| A Group/prefix has an invalid spelling           | Reject: CSS-token-safe names are required |

No Group order is an intensity scale or priority rule. Use an explicit list when
the selection or its display order should stay deliberate as the palette grows.
Use a prefix for a naming family whose future swatches should join automatically.

## Verification boundary

The parent review script checks the exact lists using the current core resolver,
declaration ordering, automatic prefix membership, no extra Color variables, and
the existing validator's rejection cases. It adapts this ordinary palette to the
current legacy mode input for those checks; that adapter is not an authoring API.
The excerpt's consumer types and the Shadow authoring file are TypeScript-checked.
The proposed Shadow helper is not executed, and no new Axis compiler is exercised.

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/verify.mjs
```

Next Color/Alpha review: existing luminance policy and its diagnostics, followed
by runtime palettes. This companion does not close the domain workshop.
