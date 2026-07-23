# @three-forma-styli/compiler

Node.js project and font compiler for Three-Forma-Styli. It contains no command
parser, prompts, terminal presentation, HTTP server, TypeScript config loader,
or network sync.

Author a project without loading the heavy build graph:

```ts
import { defineTfsProject } from '@three-forma-styli/compiler';
```

For projects that keep physical font inputs and semantic system decisions in
separate source files, use the exported `ProjectFont` and `ProjectSystem` types
with `satisfies`. This preserves literal font IDs and validates role references
before the thin `tfs.config.ts` assembly step.

Compile an already-loaded project programmatically:

```ts
import { buildProject } from '@three-forma-styli/compiler/build';

await buildProject(project, '/absolute/path/to/tfs.config.ts');
```

Resolve the same validated graph without writing or invoking FontTools:

```ts
import { planProject } from '@three-forma-styli/compiler/build';

const plan = await planProject(project, '/absolute/path/to/tfs.config.ts');
```

The versioned plan reports ownership/layout, artifacts and dependencies, exact
workspace package exports, physical font inputs, conversion strategies, missing
input status, and external-tool prerequisites. Facts that require inspecting
font bytes remain explicitly listed as build-time discoveries.

Dedicated CI can prove committed output without mutating it:

```ts
import { checkProject } from '@three-forma-styli/compiler/build';

await checkProject(project, '/absolute/path/to/tfs.config.ts');
```

The checker runs the same complete compiler in a locked sibling stage and
rejects missing, changed, or unexpected files byte-for-byte. It does not repair
the output directory.

Routine monorepo checks can validate the committed package without regeneration
or font tooling:

```ts
import { validateProjectOutput } from '@three-forma-styli/compiler/build';

await validateProjectOutput(project, '/absolute/path/to/tfs.config.ts');
```

This verifies manifest ownership/version, exact file inventory and hashes, and
the workspace host-package contract.

Font preparation and inspection APIs live at
`@three-forma-styli/compiler/fonts`. Use `@three-forma-styli/cli` when you want
the `tfs` executable, config loading, scaffolding, browser specimen server, or
Figma network sync.

Prepared-font manifests remain dependency-free facts. Copying existing
WOFF/WOFF2 assets neither requires nor claims FontTools. When TFS converts
TTF/OTF bytes, the manifest adds a `conversion.woff2` record containing the
exact FontTools and Python versions plus the executable command. No timestamps
or absolute machine paths enter generated output.

## Workspace-package output

Use the discriminated workspace layout when a repository should consume one
generated design-system package instead of copying unrelated files by hand:

```ts
export default defineTfsProject({
	fonts,
	system,
	output: {
		layout: 'workspace-package',
		directory: './generated',
		targets: {
			runtime: {
				css: {
					fontUrls: { mode: 'relative' },
					shadows: true,
					shadowModule: true,
				},
				contracts: {},
			},
			review: {
				specimen: { title: 'Typography review' },
				shadowSpecimen: { title: 'Shadow review' },
			},
			design: { dtcg: true, figmaVariables: true },
		},
	},
});
```

An enabled `css: {}` emits the entry, tokens, available semantic typography and
shadow global/CSS Module targets. An enabled `contracts: {}` emits the system, available
typography, and available native-color-mode contracts. Set individual fields to
`false` for explicit opt-outs; `runtime: true`, `review: true`, and
`design: true` are complete shorthands.

The generated tree is stable and target-oriented:

```text
generated/
  runtime/                 dependency-free ESM, declarations, and styles
  review/                  typography/shadow evidence, not package exports
  design/                  DTCG and Figma interchange, not a package export
  assets/fonts/            one prepared font asset set shared by runtime/review
  build.manifest.json      deterministic schema-v2 artifact graph
```

TFS owns and atomically replaces only `output.directory`. It never creates or
edits the host `package.json`. Before rendering and immediately around the
atomic swap, the compiler validates and hashes that human-owned manifest. It
requires `type: "module"`, exact enabled runtime exports, CSS `sideEffects`
coverage, and an explicit publishable `files` allowlist covering runtime and
font assets. Unrelated exports remain author-owned and are allowed.

Runtime font URLs may be `relative`, `public`, or `absolute`. Review output
always links the same prepared bytes through a relative stylesheet, so a CDN or
application public path never leaks into the portable specimen.

The original flat output remains available by omitting `layout` (or selecting
`layout: 'flat'`). Flat and workspace keys cannot be mixed.
