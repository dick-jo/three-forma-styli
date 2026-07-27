# Releasing to npm

The four public packages are published under the npm scope
`@three-forma-styli`. Changesets records release intent and maintains changelogs;
its fixed group keeps the packages on one coordinated version because the compiler
and CLI compose the exact core and source-preset APIs from the same release. This deliberately
favours a predictable pre-1.0 toolchain over independently versioned packages.

The production Scatter app currently consumes `@three-forma-styli/core`; it does
not consume the CLI or themes package at runtime.

## Current release state

`0.3.0` is published under both `latest` and `next`. The npm publisher is
`three___`. The release added the standalone compiler, generated workspace
package layout, runtime theme contract, semantic typography, fonts, motion,
shadows, and unified Workbench.

The next release is `0.3.1`. It fixes the typed programmatic project boundary
needed by monorepo-owned design-system authoring. Before publishing it:

- [ ] Merge the reviewed toolkit pull request to `master`.
- [ ] Confirm every Linux/Windows/FontTools/browser-consumer check is green for
      the exact merge commit.
- [ ] Run `pnpm release:version` from clean `master` and review the coordinated
      package/changelog/lockfile diff.
- [ ] Run the complete local release, packed-consumer, browser, font-conversion,
      and production dependency audit gates.
- [ ] Publish `0.3.1` under `next`, install that exact version in the Scatter
      integration branch, and privately regenerate its design-system package.
- [ ] Promote `0.3.1` to `latest` only after Scatter's automated integration
      checks pass. Scatter's ordinary CI still observes its configured
      minimum-release-age policy.

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

In Scatter, update the exact private `@repo/design-system` authoring dependency,
privately regenerate its owned `generated/` tree, and run the package,
application, browser, and final visual gates. Never treat a successful package
publish as proof that generated CSS is visually unchanged.
