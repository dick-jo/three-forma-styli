# @three-forma-styli/cli

CLI tool for generating CSS, typed design-system and typography contracts,
DTCG 2025.10/Figma Variables JSON, and visual Workbench artifacts from TypeScript definitions.

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
- `--workspace-package` - Scaffold a private, monorepo-ready package whose
  generated runtime is consumed through explicit package exports
- `--package-name <name>` - Set an independent npm package name such as
  `@repo/design-system`; the directory name remains path-safe and unscoped
- `--package-manager <manager>` - Explicitly use `npm`, `pnpm`, or `yarn`;
  otherwise TFS respects the invoking user agent, nearest lockfile, then
  available executables
- `--skip-install` - Skip automatic dependency installation

The default standalone scaffold writes a complete portable handoff to `dist/`.
The workspace-package scaffold writes a generated package boundary to
`generated/`: runtime CSS/contracts are exportable, while specimens and
design-tool JSON remain local review artifacts. Both scaffold shapes use the
same command contract: `generate` writes, `build`/`check` validate committed
output, and `check:generated` performs the expensive private regeneration proof.
Routine `build`/`check` stay independent of FontTools:

```bash
npm run generate          # explicit authoring operation
npm run check             # fast types + committed package validation
npm run check:generated   # dedicated CI drift proof
```

### `tfs build`

Build a portable project from `tfs.config.ts`:

```bash
tfs build .
```

Project mode uses the output plan in `defineTfsProject()`. It prepares configured
fonts, validates explicit typography against the in-memory font manifest, writes every artifact
to a sibling stage, hashes the result, and replaces only a TFS-owned output
directory. No separate font/build command order is required.

Inspect that exact plan before writing anything:

```bash
tfs build . --dry-run
tfs build . --dry-run --json
```

The dry run validates the output layout and host package, reports the atomic
ownership root, planned artifact/dependency graph, exact package exports, font
inputs, and external conversion prerequisites. It neither prepares fonts nor
creates the generated directory. Artifacts whose identities depend on physical
font inspection are called out separately rather than guessed.

The project contract comes from the import-safe compiler root:

```ts
import { defineTfsProject } from '@three-forma-styli/compiler';
```

Existing imports from `@three-forma-styli/cli`, `/project`, and `/fonts` remain
supported compatibility paths.

### `tfs check`

Prove that committed output exactly matches its authored project without
changing either one:

```bash
tfs check .
```

TFS performs the complete build—including font preparation and fallback
measurement—in a locked sibling stage. It compares every byte and reports
missing, changed, and unexpected files. The staged candidate is then removed;
TFS never repairs drift during a check. Run `tfs build .` deliberately to accept
and review regenerated output.

### `tfs validate`

Validate the already-committed output without rebuilding it:

```bash
tfs validate .
```

This is the fast routine build/check path for a co-located package. TFS verifies
the owning manifest and compiler version, exact artifact inventory, byte counts
and hashes, plus workspace exports, CSS side-effects coverage, published-file
coverage, and the recorded host-package hash. It does not run FontTools, prepare
fonts, or write files.

The legacy single-file workflow remains available:

```bash
tfs build ./theme.ts --output tokens.css
```

Options:

- `--output, -o <path>` - Output file path (prints to stdout if omitted)
- `--format, -f <format>` - `css`, `dtcg` (standards-based colors, dimensions,
  durations, easing curves, transitions, typography, and shadows),
  `figma-variables` (color-only), `typescript` (typography), or `specimen`
  (typography)
- `--collection <name>` - Figma collection name
- `--color-space <space>` - `srgb` or `display-p3`; must match the Figma file profile
- `--font-css <path>` - Link prepared font CSS from specimen output (requires `--output`)

Generate the configured visual Workbench in project mode:

```bash
tfs build .
```

For workspace-package output, enable `output.targets.review.workbench`; prepared
font CSS is linked automatically. Legacy flat projects can continue to use
`output.specimen` during migration. The `--format`, `--output`, and `--font-css`
flags belong to the targeted single-file workflow, not project builds.

### Machine-readable operation

`build`, `build --dry-run`, `check`, and `validate` accept the `--json`
flag. Successful commands write one versioned JSON envelope to stdout and keep
stderr empty. Targeted single-format generation requires `--output` when JSON
reporting is enabled so generated bytes and the command envelope never compete
for stdout.

Machine failures also write one JSON envelope with a stable diagnostic ID:

```json
{
	"schemaVersion": 1,
	"command": "check",
	"status": "error",
	"exitCode": 1,
	"diagnostic": {
		"id": "TFS_CHECK_FAILED",
		"message": "..."
	}
}
```

Exit codes are intentionally small and stable: `0` means success, `1` means the
requested TFS operation failed (including validation or generated drift), and
`2` means invalid CLI usage. `--no-color` disables ANSI output for human mode;
JSON mode always disables it.

### `tfs review serve`

Serve the generated workbench over localhost so fonts and browser measurements
run in a normal HTTP document rather than `file://`:

```bash
tfs review serve .
tfs review serve ./generated/review/index.html --open
tfs review serve . --port 4400
```

A project path reads `output.directory` and the configured Workbench target.
The server deliberately exposes the generated root—not only `review/`—so the
Workbench can load prepared font assets without copying or rewriting them. Run
`tfs build .` first. The default bind is `127.0.0.1`; TFS starts at port 4173
and tries the next available port. An explicit `--port` is strict and reports a
conflict instead of silently changing. The browser opens only with `--open`.

### `tfs figma-sync`

Create or update color variables through Figma's Variables REST API:

```bash
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --color-space display-p3
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --dry-run
tfs figma-sync . --file-key empty-preview --dry-run
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --policy authoritative --dry-run
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --policy authoritative --yes
```

Live sync requires Figma Enterprise access and both `file_variables:read` and
`file_variables:write` token scopes. `merge` is the default and never removes
variables or modes absent from the source. `authoritative` computes those
deletions, but live execution refuses them without `--yes`. A token-backed dry
run fetches the file and prints the exact atomic diff; a tokenless dry run is
clearly labelled as a creation preview against an empty file.

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

# Generate the complete dist/ handoff, then validate it without writing
npm run generate
npm run check
```

See the [main repo](https://github.com/dick-jo/three-forma-styli) for full documentation.
