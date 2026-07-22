# Changesets

Every user-visible or package-behaviour change should include a changeset:

```sh
pnpm changeset
```

Core, CLI and themes are a fixed release group: one package change advances all
three to the same version. Repository-only documentation, CI and private preview
changes may use an empty changeset when a pull-request policy requires one.

Maintainers combine accepted changes with `pnpm release:version`, review the
generated changelogs/version diff, run `pnpm check:release`, install the exact
canary in Scatter, and only then run `pnpm release:publish --tag next`.

The unreleased `0.2.0` manifests and hand-authored changelogs are the baseline
that introduced Changesets. Add changesets for work after that baseline; do not
add a second changeset merely to describe changes already recorded under 0.2.0.
