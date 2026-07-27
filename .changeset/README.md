# Changesets

Every user-visible or package-behaviour change should include a changeset:

```sh
pnpm changeset
```

Core, themes, compiler and CLI are a fixed release group: one public package
change advances all four to the same version. Repository-only documentation, CI
and private preview changes may use an empty changeset when a pull-request
policy requires one.

Maintainers combine accepted changes with `pnpm release:version`, review the
generated changelogs/version diff, run `pnpm check:release`, install the exact
canary in Scatter, and only then run `pnpm release:publish --tag next`.

`0.3.0` is the current published baseline. Add changesets for work after that
release; do not duplicate changes already recorded in its package changelogs.
