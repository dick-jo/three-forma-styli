# Typography component boundary

TFS generates the complete, typed typography selection contract. It does not
continuously generate application framework components.

This boundary keeps the design-system decision portable while leaving
application semantics and framework mechanics with the application:

- TFS owns valid roles, variants, physical styles, intentional weights, CSS
  declarations, CSS Module class keys, and selection validation.
- A host-owned component owns its rendered element, ref behavior, accessibility
  semantics, local class merging, and framework version.
- Component libraries may own their default typography selection internally.
  Callers should not have to reconstruct a button or input's typography merely
  because the implementation uses a local `Text` primitive.

## Generated resolver

The runtime typography contract exports `typographyClassName()`,
`TypographySelection`, and `TypographyClassMap`. The generated CSS Module
declaration contains the exact same class-key union:

```tsx
import typographyClasses from '@repo/design-system/typography.module.css';
import { typographyClassName, type TypographySelection } from '@repo/design-system/typography';

const className = typographyClassName(
	{ role: 'heading', variant: 'max', weight: 'max' },
	typographyClasses
);
```

The resolver returns the recipe class and its validated style/weight class. It
fails clearly at runtime for untyped data and fails at compile time for invalid
literal selections. It has no React, Svelte, DOM, class-merging, or Node
dependency.

That is the stable seam for a local component:

```tsx
// Deliberately illustrative: the host decides its exact polymorphic/ref API.
export function Text({
	as: Element = 'span',
	kind = 'prose',
	variant,
	fontStyle,
	weight,
	className,
	...props
}) {
	return (
		<Element
			className={[
				typographyClassName({ role: kind, variant, fontStyle, weight }, typographyClasses),
				className,
			]
				.filter(Boolean)
				.join(' ')}
			{...props}
		/>
	);
}
```

The concrete Scatter component will be designed and tested in Scatter. In a
Next App Router application it should remain server-compatible unless a real
interaction requires a client boundary. TFS must not inject `"use client"` into
the host merely to select a class.

The real Scatter trial validated one additional host concern: a component prop
named `role` collides with the native ARIA `role` attribute. Scatter therefore
uses `kind` for the generated visual role and preserves markup such as
`role="status"`. That name remains a host-component choice; TFS's portable
contract continues to call the design-system concept `role`.

## Why framework files are not normal generated output

React/Next and Svelte components require choices that design tokens cannot make:

- which elements are allowed by `as`;
- whether polymorphism is worth its TypeScript/ref complexity;
- the repository's React, Next, Svelte, and module conventions;
- class-merging policy;
- accessibility and component-library ownership;
- whether application code is a Server or Client Component.

Regenerating such a file creates either a permanently disposable wrapper or an
overwrite conflict as soon as the application customizes it. That is unlike
generated CSS and manifests, which are complete build artifacts.

The industry patterns support this split:

- [Radix Themes `Text`](https://www.radix-ui.com/themes/docs/components/text)
  is a component-library primitive with a deliberately bounded element API.
- [Panda recipes](https://panda-css.com/docs/concepts/recipes) generate typed
  class-selection contracts and make framework JSX an additional layer.
- [vanilla-extract recipes](https://vanilla-extract.style/documentation/packages/recipes/)
  expose typed class composition over build-time styles.
- [shadcn's CLI](https://ui.shadcn.com/docs/cli) copies component source into
  the host so the application owns and edits it.
- [Next Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
  make an unnecessary client boundary a material application decision.

## Possible future scaffold

After the real Scatter React implementation and at least one Svelte
implementation prove a common minimum, TFS may add:

```text
tfs add text --framework react
tfs add text --framework svelte
```

That command would copy host-owned starter source, show a dry-run/diff, refuse
silent overwrite, and never make the copied component part of generated-output
drift. It is intentionally deferred until real consumers prove which choices
are universal.
