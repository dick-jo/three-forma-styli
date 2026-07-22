# Releasing to npm

The three public packages are currently published manually under the npm scope
`@three-forma-styli`. They use one coordinated version because the CLI composes
the exact core and themes APIs from the same source release. This deliberately
favours a predictable pre-1.0 toolchain over independently versioned packages.

The production Scatter app currently consumes `@three-forma-styli/core`; it does
not consume the CLI or themes package at runtime.

## Safe release sequence

1. Start from a clean `master` and confirm the intended commit is on GitHub.
2. Run `npm whoami` and confirm the account can publish the scope.
3. Bump `core`, `themes` and `cli` to the same version. Keep their internal
   dependency declarations as `workspace:^` and regenerate the lockfile.
4. Run `pnpm install --frozen-lockfile`, `pnpm check:release`, and
   `pnpm audit --prod --audit-level=moderate`.
   `check:release` installs all three packed artifacts into a clean temporary
   consumer and checks both the import API and the executable.
5. Review each tarball with `npm pack --dry-run --json` from `packages/core`,
   `packages/themes`, and `packages/cli`.
6. Publish in dependency order with pnpm so workspace ranges are rewritten to
   normal semver ranges in the tarballs:

   ```bash
   cd packages/core && pnpm publish --access public
   cd ../themes && pnpm publish --access public
   cd ../cli && pnpm publish --access public
   ```

7. Verify `npm view @three-forma-styli/core version` (and the other packages),
   then commit the version and lockfile changes and tag the release.

Do not use plain `npm publish` while manifests contain `workspace:` ranges.

## Recommended production canary

For changes that can affect generated CSS or runtime color conversion, publish
with `--tag next`, install that exact version in `~/project-local/splinter`, run
its checks and visual QA, and only then promote the version:

```bash
pnpm publish --access public --tag next
npm dist-tag add @three-forma-styli/core@<version> latest
```

In Splinter, update the exact dependency and lockfile, run the app's checks, and
regenerate `apps/main/src/css/system.tokens.css` only when the source theme is
available and the diff has been reviewed. Never treat a successful package
publish as proof that Scatter's generated CSS is visually unchanged.
