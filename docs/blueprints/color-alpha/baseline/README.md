# Ordinary palette and explicit mode selection

Status, 2026-09-24: **proposal awaiting founder review**. This focused mock tests
the recommendation to remove `axes.default` and require complete ordinary domain
values. It does not ratify that change or implement a compiler. The earlier
[Color/Alpha mock](../README.md) remains intact for comparison.

## Inputs

- [axes.ts](./axes.ts): the available named choices and their attribute. No
  initial-mode selection, mode priority, or per-domain `isDefault`.
- [color.ts](./color.ts): three ordinary swatches and two changes for Light.
  Every identity exists in the ordinary set. Light cannot introduce a swatch
  that would be unavailable without a mode selection.

Dark is a valid selectable choice declared in `axes.ts`. There is no Dark entry
in Color because it has no changes. Its resolved values are the ordinary palette.
The first name in the axis list does not select a mode. The ordinary palette
happens to look dark; its appearance is entirely a result of the authored values.

No Alpha system is supplied in this focused example, so its complete expected
output contains three Color token names. The broader Alpha workshop is unchanged.
Alpha `defaultScale` and Shadow `defaultRange` still select short token names;
this proposal concerns only an Axis's automatic initial-mode selection.

## Expected CSS

[expected.css](./expected.css) is a hand-authored, runnable output illustration.
It emits the ordinary palette on `:root` and the resolved palette for each named
selection. Dark therefore has declarations even though the input has no Dark
changes. Selecting Dark must restore its values inside a Light scope.

Light's generated output includes `shd` even though the Light input omitted it:
the illustration spells out the complete resolved palette. This is the shared
default being carried forward, not a value the author has to duplicate.
These declarations are deliberately explicit for a single-axis example. CSS
deduplication, exact formatting, and general multi-axis generation remain later
implementation decisions; they must preserve the outcomes below.

| Document markup                  | Background        | Ink               | Shadow            |
| -------------------------------- | ----------------- | ----------------- | ----------------- |
| `<html>`                         | `oklch(0.2 0 0)`  | `oklch(0.9 0 0)`  | `oklch(0.05 0 0)` |
| `<html data-theme-mode="dark">`  | `oklch(0.2 0 0)`  | `oklch(0.9 0 0)`  | `oklch(0.05 0 0)` |
| `<html data-theme-mode="light">` | `oklch(0.96 0 0)` | `oklch(0.15 0 0)` | `oklch(0.05 0 0)` |

The application chooses the markup. Selecting nothing at the document root uses
ordinary values; no named mode is automatically selected. An application wanting
Light initially supplies the Light attribute.

## Descendants and switching

```html
<html>
	<body>
		<section data-theme-mode="light">
			<p>Light values inherited from the section.</p>
			<aside data-theme-mode="dark">
				<p>Ordinary values restored by the explicit Dark selection.</p>
			</aside>
		</section>
	</body>
</html>
```

No attribute on a descendant means it inherits its surrounding values. It does
not independently reset to the ordinary palette. This is distinct from no
selection at the document root, which gets the `:root` values.

- Changing the root attribute to Light selects Light; changing it to Dark selects
  the ordinary palette. Removing the root attribute also returns to the ordinary
  palette, without inferring a named selection.
- An explicit Light section stays Light when its enclosing page changes.
- An explicit Dark section inside Light restores the ordinary palette.
- Removing a section's attribute resumes inheritance from its surroundings.

## Verification

```sh
pnpm exec tsc -p docs/blueprints/color-alpha/tsconfig.json
node docs/blueprints/color-alpha/baseline/verify.mjs
```

The browser check reads the actual mock data and hand-authored CSS, then checks
computed custom-property values in headless Chromium. It covers document modes,
unmarked descendants, nested Light/Dark selections, dynamic changes and removal
of attributes. No screenshots or visual styling app are needed for this check.

This verifies the illustration, not production TFS compilation, exported authoring
types, general completeness validation, Alpha/Shadow dependent-variable binding,
or runtime palette policy. Those remain separate work.

The review decision is whether **complete ordinary values + named partial changes**
is the desired authoring model, with no `axes.default`. The earlier option allowed
the ordinary set to be incomplete and used an initially selected mode to complete
it. That distinction, not just deleting a field, is what this mock puts up for review.
