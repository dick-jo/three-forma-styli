---
'@three-forma-styli/compiler': minor
'@three-forma-styli/cli': minor
---

Extract project and font compilation into a dedicated Node.js compiler package.
The CLI delegates to it while retaining all existing authoring and font export
paths as compatibility re-exports.

Add a package-oriented project output layout that atomically generates separate
runtime, review, design-tool, and shared font-asset trees. Runtime output can
include browser-ready CSS, dependency-free ESM contracts, declarations, and a
compact native-colour-mode contract while the host package remains explicitly
owned and validated by its author.

Export the intermediate project-font and project-system authoring types so
split source files retain literal font-ID validation with `satisfies`.
