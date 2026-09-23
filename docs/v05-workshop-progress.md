# v0.5 workshop progress

Updated 2026-09-23. Current milestone: **1 — blueprint and ratification**.

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
  mock also distinguishes a known Color name from a value missing in one mode.
- **Settled:** the application selects the mode and supplies its attribute.
  References follow changing upstream values automatically; nested-scope output
  correctness belongs to compiler verification.
- **Remaining Axis review:** rule on the proposed limit of one controlling axis
  per authored value; confirm shared defaults and complete Shadow-list replacement
  through the concrete explanations. This replaces the previous recommendation
  to develop combined-mode syntax next. The exclusivity limit is a proposal,
  not a founder verdict.
- **Following:** Color and Alpha representative mocks using the preferred
  candidate. The separate-file example supplies initial typing/reference evidence;
  Groups, luminance policy, runtime palettes, and full domain review remain.
  Confirm the Axis pattern through the remaining domain reviews. If exclusivity
  is accepted, a combined-mode authoring feature is not a prerequisite.
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
| 1     | Shared Axes and Modes                     | Separate-file direction endorsed; application selection ratified; exclusivity proposed          | Rule on exclusivity and clarify shared defaults and Shadow-list replacement; confirm the pattern in queued domain mocks, including Typography.                                                                                               |
| 2     | Color and Alpha                           | Existing verdicts stand; representative mocks pending                                           | Immediately readable swatches and Alpha scales, the standard identity vocabulary, Groups, derived token names, and mode changes. Use focused companion examples for runtime themes and existing luminance-delta policy.                      |
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
- [ ] Blueprint, now: finish Axis rules; application selection is settled.
- [ ] Blueprint: Color + Alpha, including runtime themes and luminance policy.
- [ ] Blueprint: Spacing + Gap + Border radius/width.
- [ ] Blueprint: Time + Easing confirmation mock.
- [ ] Blueprint: Typography representative mocks.
- [ ] Blueprint: assembled-system and CSS/TS/Figma scope review.
- [ ] Architecture, hygiene, consumer migration triage, and agreed runbook.
- [ ] Implementation increments, verification, and final review.

Motion composites remain deferred. There are five queued blueprint review groups
after the current Axis review; their size differs. Several retain already ratified
contracts and need representative confirmation, not a fresh redesign.

Keep the full queue in this file. Update this tracker and the relevant Founder
Board verdict when readiness changes, distinguishing a ratified contract from
a reviewed representative mock. Surface any change in sequence explicitly.
