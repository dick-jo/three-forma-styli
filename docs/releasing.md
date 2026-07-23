# Releasing to npm

The four public packages are published under the npm scope
`@three-forma-styli`. Changesets records release intent and maintains changelogs;
its fixed group keeps the packages on one coordinated version because the compiler
and CLI compose the exact core and source-preset APIs from the same release. This deliberately
favours a predictable pre-1.0 toolchain over independently versioned packages.

The production Scatter app currently consumes `@three-forma-styli/core`; it does
not consume the CLI or themes package at runtime.

## TODO: circle back before the next npm release

- [ ] Review this procedure with fresh eyes and confirm npm scope/account access.
- [ ] Confirm the dedicated `font-conversion` CI job passed with the pinned
      Python and FontTools requirements; compare its recorded provenance with
      any project whose generated font bytes are release evidence.
- [ ] Confirm the dedicated `browser-consumer` CI job passed against the exact
      release commit; routine Node tests do not substitute for that Chromium
      proof.
- [ ] Add the appropriate Changeset for the post-`0.2.0` hardening, scoped
      typography-mode fix, and any other unreleased public changes.
- [ ] Publish an exact `next` canary, install it in Splinter, and run the full
      application and visual-regression checks before promoting `latest`.
- [ ] Replace temporary vendored TFS tarballs in downstream design-system
      projects with the reviewed published version.

No npm publication was performed during the current toolkit/design-system work.

## Safe release sequence

1. Add `pnpm changeset` with every user-visible package change. Choose the
   semver impact of the public API; the fixed group advances all four packages.
2. When preparing a release, start from a clean `master`, run
   `pnpm release:version`, and review every version, changelog and lockfile change.
   Commit and merge that release-preparation diff before publishing.
3. Run `npm whoami` and confirm the account can publish the scope.
4. Run `pnpm install --frozen-lockfile`, `pnpm check:release`,
   `pnpm check:browser`, and `pnpm audit --prod --audit-level=moderate`.
   `check:release` installs all four packed artifacts into a clean temporary
   consumer and checks the import API, public declarations through strict
   TypeScript compilation, and the executable.
5. Review each package listed by `pnpm exec changeset status --verbose`. The
   release gate already packs every package and rejects leaked `workspace:`
   protocols or incompatible public APIs.
6. Publish the fixed release through Changesets, which handles the workspace in
   dependency order:

   ```bash
   pnpm release:publish
   ```

7. Verify `npm view @three-forma-styli/core version` and the other packages,
   then push the tags produced by Changesets.

Do not use plain `npm publish` while manifests contain `workspace:` ranges.

## Recommended production canary

For changes that can affect generated CSS or runtime color conversion, publish
with `--tag next`, install that exact version in `~/project-local/splinter`, run
its checks and visual QA, and only then promote the version:

```bash
pnpm exec changeset publish --tag next
npm dist-tag add @three-forma-styli/core@<version> latest
npm dist-tag add @three-forma-styli/themes@<version> latest
npm dist-tag add @three-forma-styli/compiler@<version> latest
npm dist-tag add @three-forma-styli/cli@<version> latest
```

In Splinter, update the exact dependency and lockfile, run the app's checks, and
regenerate `apps/main/src/css/system.tokens.css` only when the source theme is
available and the diff has been reviewed. Never treat a successful package
publish as proof that Scatter's generated CSS is visually unchanged.
