# v0.5 workshop progress

Updated 2026-09-25. Current milestone: **1 — blueprint and ratification**.

This is the navigation and progress surface. The
[Founder Board](./founder-board.md) owns ratified contracts; the
[domain audit](./v05-domain-audit.md) supplies supporting implementation evidence.
Readiness here refers to the blueprint. Overhaul implementation follows the
separately agreed architecture and runbook milestone.

## Current position

- **Complete:** Shadow blueprint, representative authoring mock, expected token
  output, and consumer-responsibility boundary.
- **Reviewed direction:** the founder endorses the ordinary
  [separate-file catalogue mock](./blueprints/axes/separate-files/README.md),
  including the central `axes.ts` registry. Editor suggestions, six deliberate
  name errors, source-edit propagation, and acyclic imports are checked. The
  current mock requires Color identities in the complete ordinary catalogue.
- **Settled:** the application selects the mode and supplies its attribute.
  References follow changing upstream values automatically; nested-scope output
  correctness belongs to compiler verification.
- **Ratified 2026-09-24:** one controlling axis per complete authored value,
  shared top-level defaults, and complete Shadow-position list replacement.
  Combined-mode override syntax is outside this overhaul.
- **Baseline clarification complete:** the
  [ordinary-palette input/output mock](./blueprints/color-alpha/baseline/README.md).
  The founder confirms it is resolved: complete ordinary values, named partial
  changes, no `axes.default`. The current separate-file and Color/Alpha mocks
  now follow it; grouping identical CSS selectors is only output formatting.
- **Now:** [Color and Alpha's representative mock](./blueprints/color-alpha/README.md):
  the readable palette, shared defaults and Theme modes, standard vocabulary,
  two Alpha scales, explicit Groups, and complete expected token names.
  Baseline questions are closed. Resume the remaining Color-specific review.
- **Endorsed 2026-09-24:** the [Groups companion](./blueprints/color-alpha/groups/README.md)
  shows explicit/prefix selection, exact resolved members, inline Shadow authoring,
  and application use. Groups are named selections, separate from Axes/Modes and
  luminance enforcement. Existing resolution and validation are checked. The current
  resolver loses exact member types for prefix-based authoring; carry that bounded
  ergonomics gap into API/architecture triage, without inventing a new helper now.
- **Endorsed 2026-09-25:** the [luminance companion](./blueprints/color-alpha/luminance/README.md)
  shows ordinary authoring without a policy, runtime preview with diagnostics,
  explicit acceptance/rejection, and a customer edit that passes the exact boundary.
  Existing functions verify both polarities and ordinary/runtime token parity.
- **Authoring principle agreed:** optional design rules provide feedback as values
  change; distinguish declaring, checking, and enforcing. Authoring remains the
  primary flow. Runtime generation without a luminance policy is the intended
  direction, not implemented functionality.
- **Endorsed 2026-09-25:** the [constraint declaration](./blueprints/color-alpha/constraints/README.md)
  places optional `colors.constraints` after the values. The founder corrected the
  reopened polarity question: the theme/mode already supplies that context and
  the shared rule uses it. The duplicate inside the rule is removed; no further
  polarity-direction workshop is needed.
- **Direct polarity ratified, 2026-09-25:** a named Color property beside ordinary
  tokens and mode changes; omission in a mode retains the ordinary polarity.
  The authoring mock no longer wraps it in `metadata`. Polarity stays optional
  unless a directional check or consumer needs it; the shared rule stays unchanged.
- **Complete Color/Alpha mock updated:** the revised
  [complete mock](./blueprints/color-alpha/constraints/README.md) visibly supplies
  ordinary/Light polarity, one shared rule, and customer input. Existing
  core functions verify 40 stable outputs and authored/runtime parity.
- **Closure:** confirm two final runtime recommendations: no rule
  returns `luminance: null`; explicitly enforcing without a rule reports a
  configuration error. Preserve exact input validation and established polarity.
  After founder approval, move to Spacing and borders. Generic-Axis wiring, public
  types, live feedback, ignored `enforce` metadata, and migration remain later
  implementation work, not additional prerequisite workshops.
- **Deferred:** Motion composites. Their existing code and consumers enter later
  triage; they do not hold up the blueprint.

The shared grammar, position-pattern catalogue, standard-theme identity
vocabulary, and earlier domain verdicts remain accepted. A new mock should make
those decisions tangible. Reopen a verdict only when a concrete example reveals
an issue that warrants the founder's attention.

## Remaining sequence

The founder has asked to proceed with this workshop order. It is not an
implementation runbook. Related domains can be reviewed together, with each
domain retaining its own readiness verdict.

| Order | Workshop                                  | Current readiness                                                                               | What the review should establish                                                                                                                                                                                                             |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Shared Axes and Modes                     | Rules and baseline clarification ratified; current mocks updated                                | Carry complete ordinary values and partial mode changes into the remaining domain mocks. Exact exported types, validation and compiler strategy remain later work.                                                                           |
| 2     | Color and Alpha                           | Direct polarity ratified; two final runtime details proposed                                    | Confirm the proposed no-rule result/enforcement error. The complete mock preserves settled palette polarity and keeps ordinary token authoring the primary flow.                                                                             |
| 3     | Spacing, Gap, Border radius, Border width | Gap/Radius contracts ratified; representative mocks and remaining Spacing/Width choices pending | Generated numbered Spacing, deliberate semantic ranges referencing it, and the ordinary scalar Border width. Show how these respond to Size modes without repeated unchanged values.                                                         |
| 4     | Time and Easing                           | Authoring/helper contracts ratified; representative mocks pending                               | A short confirmation through one readable mock: the four-position Time scale, an optional longer scale, directly authored named easings, and their CSS/TS use.                                                                               |
| 5     | Typography                                | Role/size/weight/variant contracts ratified; representative mocks pending                       | Start with atomic Font size and ordinary role authoring. Cover supported size and weight choices, categorical variants, and prepared font facts through focused examples. Review readability carefully given the history of complexity here. |
| 6     | One assembled design system               | Pending the preceding reviews                                                                   | Read the whole authored system and its CSS/TS consumer examples together. Check consistent naming, references, modes, helpers, and the standard-theme vocabulary. Confirm the useful Figma subset and clear unsupported cases.               |

The Axes/Modes example should stay grounded in Color and Spacing. Its purpose is
to settle their shared authoring pattern before other mocks need it. Shadow can
demonstrate automatic Color following and a genuine measurement override without
reopening its settled catalogue grammar.

## Readiness check for each domain

- The main declaration is immediately visible and reads as authored choices.
- Ordinary usage and the meaningful additional cases have representative mocks.
- Expected token names and consumer usage are visible and understandable.
- Position patterns, identities, references, helpers, and mode participation have
  been checked against the shared grammar.
- Remaining questions have a verdict or an explicit deferral, and the founder
  is satisfied with the example.

Use the same quality bar throughout; the amount of discussion depends on what
the example reveals. Time/Easing may need a short confirmation; Typography may
need several focused passes. Existing source files alone do not count as reviewed
mocks of the intended overhaul.

## Milestone transitions

1. **Blueprint and ratification — current.** Complete the domain mock reviews and
   assembled-system review; settle or explicitly defer remaining product choices.
2. **Architecture, hygiene, triage, and runbook — later.** Compare the codebase and
   real consumers with the blueprint. Review package ownership, obsolete code,
   migration needs, implementation dependencies, and verification with the founder.
   Agree on bounded implementation increments.
3. **Implementation in reviewable increments — after the agreed runbook.** Work
   through those increments with concrete code and output review.

Moving between milestones requires a deliberate agreement. Continuing a workshop
stays within milestone 1.

## Keep progress visible

End substantive workshop replies with this compact roadmap, updating readiness
each turn. The finish line includes all three milestones; do not present blueprint
completion as implementation completion or invent implementation increment counts
before the runbook is agreed.

- [x] Blueprint: Shadow workshop and representative mock.
- [x] Blueprint: Axis rules, complete ordinary values, and input/output mock.
- [ ] Blueprint, now: close Color + Alpha; direct polarity ratified, two runtime details remain.
- [ ] Blueprint: Spacing + Gap + Border radius/width.
- [ ] Blueprint: Time + Easing confirmation mock.
- [ ] Blueprint: Typography representative mocks.
- [ ] Blueprint: assembled-system and CSS/TS/Figma scope review.
- [ ] Architecture, hygiene, consumer migration triage, and agreed runbook.
- [ ] Implementation increments, verification, and final review.

Motion composites remain deferred. Color/Alpha is the current review; four further
blueprint review groups follow it. Several retain already ratified
contracts and need representative confirmation, not a fresh redesign.

Keep the full queue in this file. Update this tracker and the relevant Founder
Board verdict when readiness changes, distinguishing a ratified contract from
a reviewed representative mock. Surface any change in sequence explicitly.
