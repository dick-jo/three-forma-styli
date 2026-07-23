# TFS workbench architecture

## Product position

The workbench is TFS's generated visual calibration and verification surface.
It is not a component catalogue, a replacement for Storybook, or a second source
of truth. It turns one compiled design-system IR into executable review cases
that humans and browsers inspect through the same interface.

The governing loop is:

```text
authored system
    ↓ tfs build
resolved IR + diagnostics
    ↓
versioned review contract
    ↓
portable workbench
    ├── interactive calibration
    ├── named comparison matrices
    └── automated browser verification
```

The authored project remains canonical. Workbench edits are a disposable draft
overlay until the author explicitly promotes them.

## Starting point this architecture replaced

- `apps/preview` is a private, color-only Svelte experiment coupled directly to
  the default preset. It does not load an arbitrary built TFS project.
- Typography and shadow specimens are independently generated HTML documents.
  They prove useful domain interactions but duplicate their own shells, styles,
  controls, state, and test hooks.
- `build.manifest.json` still represents review through a singular typography
  `specimen` entrypoint even when shadow review output also exists.
- Review cases are implicit markup. They are not a stable, enumerable contract
  that a browser runner can consume.

The existing specimens were valuable prototypes. Their domain logic is lifted
into Workbench labs rather than embedded or iframe-composed unchanged.

## Recommended architecture

### 1. A versioned review contract

The compiler emits `review/workbench.json` from the same resolved IR used for
runtime output:

```ts
interface TfsWorkbenchContract {
	kind: 'three-forma-styli/workbench';
	schemaVersion: 1;
	systemFingerprint: string;
	toolVersion: string;
	assets: {
		runtimeCss: string;
		fontCss?: string;
	};
	globals: {
		colorModes: ReviewGlobal[];
		sizeModes: ReviewGlobal[];
		viewports: ReviewViewport[];
		media: ReviewMediaState[];
	};
	labs: ReviewLab[];
	diagnostics: ReviewDiagnostic[];
}
```

Every lab owns stable, CSS-safe IDs, its cases, typed controls, source/resolved
values, diagnostics, and capture policy. Case IDs must survive ordering changes
and become permalink and screenshot-baseline keys.

The review contract is deliberately distinct from:

- the authored project, which may use helpers and executable TypeScript;
- the normalized IR, which contains compiler details the UI does not need;
- runtime contracts, which applications consume and must remain compact.

### 2. One portable generated application

When review output is enabled, TFS produces:

```text
generated/review/
├── index.html
├── workbench.json
├── system.css
├── workbench.js
└── workbench.css
```

It must work offline through `tfs review serve`, contain no network calls, and
remain excluded from generated runtime package exports. A generated
design-system package does not install Svelte, Vite, Playwright, or workbench
code in an application bundle.

The workbench source may use Svelte. Its published artifact should be a bundled,
dependency-free browser shell. Framework choice is an implementation concern,
not part of the review contract.

### 3. Domain labs, not generic token forms

The shell supplies navigation, draft state, comparison, permalinks, keyboard
handling, and capture mode. Each domain supplies purpose-built visual reasoning:

- **Overview:** build identity, diagnostics, modes, assets, and changed drafts.
- **Color:** solids/alpha ramps, semantic relationships, gamut diagnostics,
  theme matrices, and luminance constraints.
- **Typography:** role recipes, editable tuples, weight/style capability,
  metrics, fallback comparison, wrapping, glyph stress, and dense UI contexts.
- **Shadow:** ordered layers, clipping, banding, surface polarity, and text
  rasterization.
- **Motion:** easing plots, duration comparison, semantic recipes, interruption,
  and reduced-motion behavior.
- **Foundations:** spacing, gap, radius, border, and time scales rendered in
  comparable physical contexts.

A generic token inspector remains useful as a secondary view. It must not
replace the visual grammar of each domain.

### 4. Lean workbench chrome

The durable layout is:

```text
┌──────────┬──────────────────────────────────┬──────────────┐
│ labs     │ canvas / matrix / compare        │ inspector    │
│          │                                  │              │
│ overview │ selected named case              │ value        │
│ color    │ target system renders here       │ resolved     │
│ type     │                                  │ source hint  │
│ shadow   │                                  │ diagnostics  │
│ motion   │                                  │ draft        │
└──────────┴──────────────────────────────────┴──────────────┘
```

The chrome uses a neutral internal visual system so a broken or low-contrast
target theme cannot make its own editor unusable. Only the canvas is governed by
the reviewed design system.

Every visual domain has two complementary canvas modes:

- **Matrix** is the default entrypoint for a lab. It renders every currently
  visible case together, using a domain-specific compact specimen so authors and
  browser tests can spot rhythm, outliers, missing steps and theme-wide
  regressions.
- **Case** expands one specimen into its full diagnostic and calibration surface.
  Selecting any matrix tile drills into the same stable case permalink.

Search and global modes scope the matrix without creating a separate source of
truth. The inspector describes the matrix while it is visible; it must not show
controls for a hidden, coincidentally active case.

The top-level Overview is a third, wider zoom level: a whole-system proof sheet.
It combines the build facts with compact matrices for the active color mode,
typography, shadows, motion and foundations in one scrollable surface. A tile
drills directly into its focused case; a domain heading opens that domain's full
matrix.

Global mode, viewport, surface, draft/baseline, and capture controls belong in a
small persistent bar. Less common diagnostics use progressive disclosure.
Keyboard navigation and a command palette prevent the UI becoming toolbar-heavy.

### 5. Non-destructive draft editing

The baseline contract is immutable. Every control creates a typed draft
operation:

```ts
interface ReviewDraftOperation {
	path: string;
	previous: unknown;
	value: unknown;
}
```

The browser keeps undo/redo history and may persist the draft locally by system
fingerprint. Reset operates at control, recipe, lab, and project levels.

Initial promotion mechanisms:

1. export and re-import the versioned `tfs.review.patch.json`;
2. copy a tool-agnostic agent handoff containing that exact patch, the system
   fingerprint, selected cases, and build/check commands;
3. show exact JSON-pointer-like source paths beside their resolved effects.

The browser must not rewrite arbitrary TypeScript configuration. A later
`tfs review apply` can be designed only for an explicit machine-editable source
contract; it must never guess how to rewrite helper calls or user code.

The handoff is the first-class agentic boundary. Codex, Claude, or another coding
agent applies the reviewed decisions to authored TypeScript, preserves helper
structure, regenerates owned output, runs the declared checks, and commits the
coherent source plus generated result. TFS supplies facts and verification;
version control credentials and code-writing authority remain with the agent and
host repository. A thin MCP/agent adapter can eventually automate transport of
the same schema without changing its semantics.

Patch import is contract-bound rather than a blind JSON merge. Workbench rejects
foreign fingerprints, stale baseline values, duplicate or unknown paths,
unknown cases, invalid select values, out-of-range numbers, unsupported schema
versions, and files above its bounded import size. A valid import is one
undoable transaction and may replace an existing disposable draft.

### 6. Named cases are executable cases

Each case has a stable permalink containing only durable IDs:

```text
/review/?lab=typography&case=prose--base&color=light&size=default
```

Controls may update the URL when values are serializable, following Storybook's
useful args/permalink idea without adopting its component-story model.

The compiler expands each case's capture policy into
`generated/review/captures.json`. Every state contains a stable screenshot ID,
exact permalink, viewport dimensions, and resolved color/size modes. The plan
always includes the whole-system overview; domain policies then avoid a
meaningless full Cartesian product (for example, a typography case captures its
own size mode against the default color mode, while shadows exercise every
color mode).

The output is deliberately runner-neutral. A project can opt into Playwright
baselines without importing the Workbench source application:

```ts
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const plan = JSON.parse(await readFile('generated/review/captures.json', 'utf8'));

for (const state of plan.states) {
	test(state.id, async ({ page }) => {
		await page.setViewportSize(state.viewport);
		await page.goto(`/review/${state.url.slice(2)}`);
		await page.locator('html[data-tfs-workbench-ready="true"]').waitFor();
		await expect(page).toHaveScreenshot(`${state.id}.png`);
	});
}
```

TFS's packed-consumer integration suite consumes the same generated states in
real Chromium and verifies their viewport, permalink, case, and modes. A future
dedicated `tfs review test` may provide convenience orchestration, but it must
not change this portable data boundary. A project-owned runner should verify:

- page and font readiness;
- no browser errors or warnings;
- expected computed CSS and mode selectors;
- stable DOM/accessibility invariants;
- selected visual screenshots;
- interaction behavior for reset, draft, modes, and comparison.

Visual baselines are opt-in and project-owned. Screenshot capture must pin
browser version, viewport, media, animation state, fonts, and operating
environment. Playwright explicitly warns that host OS, hardware, settings and
browser versions affect rendered pixels, so arbitrary developer-machine
screenshots cannot be treated as portable truth.

Baseline updates are therefore an explicit project review operation. TFS never
silently creates, repairs, or accepts screenshot changes during `build` or
`check`.

Wide-gamut correctness additionally requires declaration/computed-style tests:
ordinary screenshot pipelines are not sufficient proof that P3 chroma survived.

### 7. Package boundary

Recommended final responsibility split:

```text
apps/workbench/                 private source application and local dogfood
packages/compiler/workbench-assets/
                                prebuilt dependency-free browser shell
packages/core/                  review data/domain derivation
packages/compiler/              contract/assets/output planning
packages/cli/                   serve, open, test, and explicit promotion commands
```

The private Svelte/Vite source builds static assets into the compiler package.
Svelte and Vite are compiler development dependencies, never compiler runtime
dependencies. The compiler copies those assets only when a project requests
review output. Application runtime packages never export them. This proves the
boundary without adding another public package merely to hold three static
files.

`pnpm workbench:sync` is the only intentional source-to-compiler synchronization
step. Routine builds compile the private app into ignored `apps/workbench/dist`;
`pnpm check:workbench` byte-compares that canonical build with the committed
compiler assets and fails on drift. This keeps ordinary checks non-mutating while
still making the published compiler tarball reproducible.

## Options considered

### A. Generated TFS workbench — recommended

One portable artifact, one review schema, TFS-specific domain UX, deterministic
named cases, no host-framework coupling.

Cost: TFS owns a real UI product and its accessibility, release, and visual-test
quality.

### B. Storybook integration

Generate stories/addons for tokens and specimens.

Benefit: mature navigation, controls, permalinks, collaboration, and visual-test
ecosystem.

Rejected as the core: forces a component-workbench dependency and framework
configuration into projects that only need design-system generation. A later
optional adapter could expose TFS cases inside an existing Storybook.

### C. Dynamic authoring IDE

Run a Node server that imports config, compiles on every edit, and writes source
files from the browser.

Benefit: tightest possible edit/build loop.

Deferred: executable TypeScript is not safely round-trippable, font preparation
is too heavy for every slider movement, and source mutation dramatically
increases the security and failure surface. The portable read/draft/compare
foundation does not prevent a carefully scoped authoring server later.

## Phased delivery

### Foundation

- review schema and stable IDs;
- workbench shell boundary and generated `review/index.html`;
- neutral chrome, routing, global modes, draft store, undo/reset;
- migrate typography and shadow prototypes without iframes;
- manifest correctly enumerates all review artifacts and entrypoints.

### Calibration

- color and foundation labs;
- before/draft comparison;
- patch export/import and copyable authored values; **implemented**
- domain diagnostics and source hints.

### Automation

- `tfs review serve` and `tfs review test`;
- manifest-driven browser smoke/interaction tests;
- opt-in pinned screenshot baselines and update workflow;
- accessible workbench UI and focused sample diagnostics.

### Extensions

- motion and reduced-motion lab;
- optional host-component fixtures or Storybook adapter;
- explicitly designed CLI promotion for machine-editable authored sources.

## Industry principles adopted

- Storybook: controls modify serializable case arguments; stable cases are both
  review surfaces and test inputs; URLs are permalinks.
- Playwright: visual comparisons use reviewed baselines and a pinned rendering
  environment, with explicit baseline updates.
- Tokens Studio: changes remain non-destructive while exploring and theme/mode
  context is first-class.
- TFS: the toolkit owns derivation and domain opinions; it does not become an
  unlimited generic graph editor or transformation marketplace.

References:

- <https://storybook.js.org/docs/essentials/controls>
- <https://storybook.js.org/docs/writing-stories/args>
- <https://storybook.js.org/docs/configure/user-interface/sidebar-and-urls>
- <https://storybook.js.org/docs/writing-tests/index>
- <https://playwright.dev/docs/test-snapshots>
- <https://playwright.dev/docs/emulation>
- <https://docs.tokens.studio/graph-engine/introduction>
