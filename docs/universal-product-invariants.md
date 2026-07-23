# Universal product invariants

TFS is an opinionated design-system compiler. It is not a Scatter-specific
generator and it is not a generic bag of token transforms.

Scatter, `scatter-mktgfx`, and future production integrations are reference
consumers: they expose real pressure, but they do not define core vocabulary,
artifact paths, role names, mode names, font families, package names, framework
choices, or runtime policy.

## Product contract

The lasting value proposition is:

> Provide a small set of deliberate design decisions, receive a coherent,
> sophisticated, portable system with visible derivation and safe escape hatches.

Every feature must preserve all of these properties:

1. **Opinionated defaults, author-owned vocabulary.** Defaults reduce decisions.
   Authors may replace names, schedules, prefixes, selectors, roles and outputs
   through explicit contracts. Core never contains a customer font, theme,
   network, brand or application role.
2. **One normalized truth.** Authored inputs validate into a framework-neutral
   IR. CSS, TypeScript, DTCG, Figma data, runtime theme contracts and Workbench
   cases derive from that IR rather than copying decisions between formatters.
3. **Derivation is inspectable.** Helpers may generate explicit foundational
   data, but the resolved manifest, diagnostics and Workbench expose what was
   derived. Silent semantic substitution is forbidden.
4. **Outputs are target-specific, not consumer-specific.** Runtime, review and
   design targets may transform the same IR independently. A Next.js monorepo,
   a Vite application, a static site and a non-web exporter must not require
   Scatter-shaped paths or scripts.
5. **Generated ownership is exact.** One declared generated directory is staged
   and atomically replaced. TFS does not patch arbitrary host files, clean broad
   directories, or copy one contract into several application folders.
6. **Writing and checking are distinct.** Generation is explicit. Routine build
   and check commands validate committed artifacts without FontTools or writes.
   Drift checks regenerate privately and fail with actionable evidence.
7. **Runtime weight is opt-in.** Applications consuming static generated output
   install no compiler, CLI, prompt, filesystem, font-processing or Workbench
   source graph. User-authored runtime themes use the smallest explicit browser
   subpath.
8. **Names are data, not syntax.** Every author-facing identifier is validated.
   Internal case IDs and filenames encode names deterministically and
   collision-free instead of assuming one project's tidy vocabulary.
9. **Visual review and automation share cases.** The same versioned Workbench
   contract drives overview matrices, focused calibration, permalinks and
   browser tests. Test-only visual fixtures cannot drift into a second system.
10. **No hidden compatibility debt.** Deprecated paths are isolated, documented
    and tested as migration boundaries. New architecture does not inherit old
    shapes merely because a production consumer currently uses them.

## Reference-consumer test matrix

No production-derived feature is complete until it passes at least one neutral
fixture. The release suite should grow across these shapes:

| Shape                     | Pressure it proves                                    |
| ------------------------- | ----------------------------------------------------- |
| Minimal token project     | Partial systems and omitted domains remain valid      |
| Editorial system          | Non-Scatter roles, weights, variants and naming       |
| Dense application system  | Independent modes, runtime themes and typed CSS       |
| Display/graphics system   | Large physical scales without app-UI assumptions      |
| Private monorepo package  | Workspace exports, task graphs and committed output   |
| Packed standalone package | No workspace resolution or leaked dev tooling         |
| Vite browser consumer     | Standards-based CSS/ESM consumption                   |
| Next.js browser consumer  | Framework CSS/font asset and server/client boundaries |
| Runtime theme consumer    | Strict untrusted-data validation and scoped CSS       |

Scatter may be the strongest instance of several rows. It must never be the only
instance.

## Architectural review checklist

Before merging a new domain or integration feature:

- Does any generic source file mention a consumer, brand, font or theme?
- Could an author rename every relevant role, mode, variant and prefix?
- Is the value represented once in authored data or IR?
- Are dependency directions still `core → compiler → CLI`, with the Workbench
  source private and generated browser assets dependency-free?
- Does normal package import avoid eager filesystem, prompt and font machinery?
- Does a dry run expose every artifact before writing?
- Does a check explain missing, unexpected and changed output without repairing it?
- Is every external prerequisite pinned or explicitly reported?
- Do machine-readable diagnostics use stable IDs and schema versions?
- Is the implementation covered by a hostile neutral fixture and a real packed
  consumer?
- Can the feature be removed or migrated without hand-editing generated files?

## What we borrow—and improve

- [Style Dictionary's architecture](https://styledictionary.com/info/architecture/)
  clearly separates parsing, preprocessing, transformation, reference
  resolution and formatting. TFS keeps that phase clarity, while using a
  smaller opinionated IR and exact atomic output ownership instead of unlimited
  ordered hooks.
- [Style Dictionary transforms](https://styledictionary.com/reference/hooks/transforms/)
  begin from the same token source independently per platform. TFS target
  adapters must preserve the same isolation: a browser CSS decision cannot
  mutate DTCG or native output.
- [Prettier's CLI](https://prettier.io/docs/cli) makes write/check behavior,
  configuration precedence and cache caveats explicit. TFS follows the boring
  command semantics but adds a versioned artifact plan and external-tool
  provenance.
- [Storybook's test runner](https://storybook.js.org/docs/writing-tests/test-runner)
  turns visible cases into browser-executed tests and supports filtering,
  sharding and CI. TFS uses the same case-as-contract principle without making
  design tokens pretend to be component stories.
- [Storybook portable stories](https://storybook.js.org/docs/api/portable-stories/portable-stories-jest)
  demonstrate that authored cases should survive outside one UI shell. TFS
  Workbench cases likewise remain plain versioned data consumable by other
  runners and agents.
- Turborepo's declared input/output model informs TFS task guidance, but TFS does
  not mutate a host repository's task graph. The host remains authoritative for
  caching and orchestration.

“Better” here does not mean more knobs. It means fewer accidental decisions,
clearer ownership, stronger evidence and a smaller trustworthy surface.
