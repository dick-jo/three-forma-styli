# @three-forma-styli/cli

CLI tool for generating CSS, typed design-system and typography contracts,
color-only DTCG/Figma Variables JSON, and typography specimens from TypeScript definitions.

## Installation

Install the compiler and CLI in the design-system project so `tfs.config.ts`,
the executable and the lockfile always use the same release:

```bash
npm install --save-dev @three-forma-styli/compiler @three-forma-styli/cli
npx tfs --help
```

For the initial scaffold, `npx @three-forma-styli/cli init my-design-system`
avoids a global install. Generated projects install their own local CLI and run
that locked executable through package scripts.

## Commands

### `tfs init`

Scaffold a complete design-system source project with pinned local tooling:

```bash
tfs init
```

Creates authored system files, `tfs.config.ts`, a programmatic `index.ts`, local
build/check/specimen scripts, package metadata, TypeScript configuration, and a
project README. The scaffold pins core, compiler and CLI to the same compatible
release; it never writes independent `latest` ranges.

Options:

- `-t, --theme <name>` - Choose the starter source preset (default: "default")
- `--skip-install` - Skip automatic dependency installation

### `tfs build`

Build a portable project from `tfs.config.ts`:

```bash
tfs build .
```

Project mode uses the output plan in `defineTfsProject()`. It prepares configured
fonts, validates explicit typography against the in-memory font manifest, writes every artifact
to a sibling stage, hashes the result, and replaces only a TFS-owned output
directory. No separate font/build command order is required.

The project contract comes from the import-safe compiler root:

```ts
import { defineTfsProject } from '@three-forma-styli/compiler';
```

Existing imports from `@three-forma-styli/cli`, `/project`, and `/fonts` remain
supported compatibility paths.

The legacy single-file workflow remains available:

```bash
tfs build ./theme.ts --output tokens.css
```

Options:

- `--output, -o <path>` - Output file path (prints to stdout if omitted)
- `--format, -f <format>` - `css`, `dtcg` (color-only), `figma-variables`
  (color-only), `typescript` (typography), or `specimen` (typography)
- `--collection <name>` - Figma collection name
- `--color-space <space>` - `srgb` or `display-p3`; must match the Figma file profile
- `--font-css <path>` - Link prepared font CSS from specimen output (requires `--output`)

Generate the configured typography calibration workbench in project mode:

```bash
tfs build .
```

Set `output.specimen` in `tfs.config.ts`; prepared font CSS is linked
automatically. The `--format`, `--output`, and `--font-css` flags belong to the
targeted single-file workflow, not project builds.

### `tfs specimen serve`

Serve the generated workbench over localhost so fonts and browser measurements
run in a normal HTTP document rather than `file://`:

```bash
tfs specimen serve .
tfs specimen serve ./generated/typography.specimen.html --open
tfs specimen serve . --port 4400
```

A project path reads `output.directory` and the configured `output.specimen.file`.
Run `tfs build .` first. The default bind is `127.0.0.1`; TFS starts at port 4173
and tries the next available port. An explicit `--port` is strict and reports a
conflict instead of silently changing. The browser opens only with `--open`.

### `tfs figma-sync`

Create or update color variables through Figma's Variables REST API:

```bash
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --color-space display-p3
tfs figma-sync . --file-key dry-run --dry-run
```

Live sync requires Figma Enterprise access and both `file_variables:read` and
`file_variables:write` token scopes. The command does not delete variables or
modes that are absent from the source.

### `tfs fonts inspect`

Inspect font names, real static/variable weight ranges, axes, metrics, features,
embedding flags, and file identity:

```bash
tfs fonts inspect ./fonts/Example.woff2
tfs fonts inspect ./fonts/Example.woff2 --json
tfs fonts inspect ./fonts/Example.woff2 --output ./generated/font-inspection.json
```

### `tfs fonts prepare`

Prepare licensed font files from a typed config and generate `@font-face` CSS,
copied license text, and an authoritative manifest:

```bash
tfs fonts prepare ./fonts.config.ts
```

The command supports byte-preserving copies and deterministic FontTools WOFF2
conversion. Conversion requires explicit `license.allowTransformations: true`;
every family also requires `license.allowWebEmbedding: true` and a non-empty
`webEmbeddingBasis` recording why. Subsetting is never implicit. Preparation is
staged, reconciles the TFS-owned
`licenses/` directory and files tracked by the previous manifest, preserves unrelated
files elsewhere, and rolls back if the complete
font/CSS/manifest set cannot be committed. Restrictive OS/2 embedding flags stop
preparation unless the license config records a reasoned acknowledgement that the
font metadata is incorrect. These checks do not grant legal permission: confirm the
actual license permits your conversion, redistribution, and serving method. The
attestation records the project owner's decision; TFS does not make that decision.

The strategy is normally derived from each source: WOFF/WOFF2 files are copied
byte-for-byte, while TTF/OTF files are converted to WOFF2. Set `strategy`
explicitly only when a project needs to override that policy.

The ordinary `tfs build` workflow runs this preparation first when `fonts` are
declared in `tfs.config.ts`. Its default global typography output includes the
generated faces before ordinary-class `.text--…` helpers. Zero-specificity
`:where()` helpers remain available as an explicit option. Asset URLs are
explicitly portable-relative, public-root, or absolute/CDN:

```ts
output: {
	fontAssets: { directory: 'fonts', urls: { mode: 'relative' } },
	css: {
		file: 'tokens.css',
		selectors: {
			root: ':root',
			colorMode: '[data-color-mode="{mode}"]',
			sizeMode: '[data-size-mode="{mode}"]',
			timeMode: '[data-time-mode="{mode}"]',
		},
	},
		typographyCss: {
			file: 'typography.css',
			classPrefix: 'text', // TFS emits `.text--…`
			specificity: 'class', // default; use zero for :where(...)
			fontFaces: 'include', // or separate / none
	},
}
```

Selector templates are first-class project output policy: color, size, and time
modes remain independently selectable, while projects can rename the attributes.
Set `systemTypescript: true` to emit `system.generated.ts`, a standalone typed
contract containing every mode's authored source values, optional metadata, and
resolved CSS token values. This is intended for application code that needs mode
keys and labels without copying the design-system definitions.

URLs are rendered for the target stylesheet, so moving typography CSS into a
nested directory correctly changes `src` paths. `fontFaces: 'separate'` keeps
`fonts/fonts.css`; `none` delegates face loading to the host framework.

When a prepared project font declares `category: 'sans'` or `category: 'mono'`
and does not provide an explicit fallback stack, the same build derives
per-style/per-weight adjusted fallback faces for physical upright and italic
cuts. It emits private fallback faces, adds them to the semantic family stack,
and writes `fonts/fallbacks.manifest.json` with exact inputs, measurements,
profile provenance and warnings. The specimen can force adjusted or completely
unadjusted rendering. TFS fails unsupported selections and never silently
substitutes a style or weight. See `docs/typography-fallback-metrics.md` for the
formula, profile limits and browser-comparison guidance.

## Example Workflow

```bash
# Create a new project from the default preset
tfs init my-design-system
cd my-design-system

# Edit your theme files
# (full IntelliSense from @three-forma-styli/core)

# Generate the complete dist/ handoff
npm run check
```

See the [main repo](https://github.com/dick-jo/three-forma-styli) for full documentation.
