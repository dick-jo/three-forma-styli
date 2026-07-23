# Industry workflow benchmark

TFS should feel unsurprising inside serious repositories without becoming a
generic pipeline. This document records what we deliberately borrow from mature
tools and what we deliberately reject.

## Prettier: boring command semantics

Prettier's most valuable contract is not formatting syntax. It is operational:
the local project version and configuration determine behavior; writing and
checking are visibly different operations; and exit codes distinguish success,
expected drift, and tool failure.

TFS applies that model as follows:

- `generate`/`tfs build` is the explicit write operation;
- routine `build` and `check` scripts validate committed output without writing;
- `tfs check` performs a private full regeneration and reports byte drift;
- local TFS packages are pinned exactly in generated projects;
- project configuration is portable and local, never global;
- machine output is a versioned JSON envelope with stable diagnostic IDs and
  exit codes `0`, `1`, and `2`;
- `tfs build --dry-run --json` exposes the effective artifact plan without a
  write or font conversion.

References: [Prettier CLI](https://prettier.io/docs/cli),
[Prettier configuration](https://prettier.io/docs/configuration).

## Storybook: review cases are executable cases

Storybook treats isolated visual states as both a review surface and real-browser
test input. TFS adopts that principle without shipping a component workbench:

- the typography specimen is a generated, isolated, interactive review artifact;
- `tfs specimen serve` gives it a normal localhost browser boundary;
- packed release tests execute a generated design-system package and strict
  runtime theme in Chromium;
- browser binaries and Playwright remain repository/release tooling, outside all
  published TFS and generated design-system packages.

Future visual checks should grow from named specimen states, not from a parallel
set of test-only HTML fixtures.

Reference: [Storybook UI testing](https://storybook.js.org/docs/writing-tests/index).

## Style Dictionary: explicit targets and non-mutating transforms

Style Dictionary demonstrates the value of named build targets and of formatting
processed data in memory before choosing whether to write it. TFS uses an
explicit artifact plan and distinct runtime/review/design targets, but retains a
stronger owned-output guarantee:

- every requested target appears in the plan and build manifest;
- all artifacts stage before the managed directory is atomically replaced;
- stale managed artifacts disappear through ownership, not a broad `clean`;
- output adapters may eventually grow from the stable IR and plan, but arbitrary
  lifecycle actions are not accepted as an early extension mechanism.

TFS intentionally does not copy Style Dictionary's unlimited transforms,
formats, parsers, actions, platform partial builds, or generic clean command.
Those are useful for a general conversion framework but would weaken TFS's
opinionated “few decisions in, coherent system out” value.

References: [Style Dictionary configuration](https://styledictionary.com/reference/config/),
[Style Dictionary API](https://styledictionary.com/reference/api/).

## Turborepo: declared work and cache honesty

Turborepo assumes cached work is deterministic and that behavior-changing inputs
and material outputs are declared. TFS therefore documents host task inputs and
outputs but does not edit a monorepo's task graph:

- routine validation has no outputs and no FontTools dependency;
- explicit generation owns `generated/**`;
- heavy drift checks stage and discard their candidate, so they also declare no
  persistent output;
- font conversion is not cacheable until source bytes plus exact Python,
  FontTools, and Brotli identity participate in the key;
- `--dry-run --json` makes the TFS artifact graph inspectable beside the host
  task graph.

References: [Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching),
[Turborepo dry runs](https://turborepo.dev/docs/reference/run#--dry--dry-run).

## Explicit non-goals for the current release

- global or user-machine configuration;
- an internal persistent cache;
- a broad plugin/hook marketplace;
- partial writes into one managed output tree;
- a `clean` command that can target arbitrary host paths;
- host `package.json`, workspace, or task-graph mutation during normal builds;
- browser, preview-framework, font compiler, or interactive prompt dependencies
  in generated application packages.

Each can be reconsidered when a real use case supplies a safe contract. None is
necessary to make TFS production-native today.
