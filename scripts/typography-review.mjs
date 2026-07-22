import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(tmpdir(), 'tfs-typography-review');
const cli = path.join(root, 'packages/cli/dist/index.js');
const theme = path.join(root, 'examples/typography/theme.ts');
const project = path.join(root, 'examples/project');

const temporaryProject = mkdtempSync(path.join(root, 'examples/.tfs-typography-review-'));

rmSync(outputDirectory, { force: true, recursive: true });
mkdirSync(outputDirectory, { recursive: true });

const outputs = [
	['css', 'tokens.css'],
	['typescript', 'typography.generated.ts'],
	['specimen', 'typography-specimen.html'],
];

for (const [format, filename] of outputs) {
	execFileSync(
		process.execPath,
		[cli, 'build', theme, '--format', format, '--output', path.join(outputDirectory, filename)],
		{ cwd: root, stdio: 'inherit' }
	);
}

try {
	cpSync(project, temporaryProject, {
		recursive: true,
		filter: (source) => path.basename(source) !== 'generated',
	});
	execFileSync(process.execPath, [cli, 'build', temporaryProject], {
		cwd: root,
		stdio: 'inherit',
	});
	cpSync(path.join(temporaryProject, 'generated'), path.join(outputDirectory, 'portable-project'), {
		recursive: true,
	});
} finally {
	rmSync(temporaryProject, { force: true, recursive: true });
}

copyFileSync(theme, path.join(outputDirectory, 'authoring-config.ts'));
writeFileSync(
	path.join(outputDirectory, 'REVIEW.md'),
	`# TFS typography review

This disposable bundle was generated from \`authoring-config.ts\` by the current
workspace build. The checked manifest contains verified metadata but no licensed
font bytes, so this bundle proves the contract and specimen structure—not final
font rendering.

## Read in this order

1. \`portable-project/build.manifest.json\` — the complete output inventory and hashes.
2. \`portable-project/index.css\` and \`tokens.css\` — production imports and role-bound variables.
3. \`portable-project/typography.generated.module.css\` — kebab-case local recipes.
4. \`authoring-config.ts\` and \`typography.generated.ts\` — the targeted typed font contract.
5. \`typography-specimen.html\` — every role base and variant, styles, weights, wrapping widths,
   and dense UI cases. Missing font declarations are expected in this fixture.

## Decisions for a real-font review

- Do Supreme heading \`l\` and \`max\` line heights survive two and three lines?
- Should Supreme begin as heading-only or own both heading and ordinary text?
- Is JetBrains Mono 500 the right default for labels?
- Are the exposed weight aliases useful distinctions rather than decorative choice?
- Do fallback metrics remain stable at every shipped role, style, and weight?

For final evidence, copy \`examples/typography/tfs.config.example.ts\` into a
disposable project, supply the licensed font and license paths, and run
\`tfs build .\`. The project compiler prepares/converts the fonts, places
\`@font-face\` before global helpers with target-relative URLs, and connects the
same stylesheet to the specimen. TFS does not publish or mutate Scatter as part
of this review command.
`
);

console.log(`\nTypography review bundle: ${outputDirectory}`);

console.log('  REVIEW.md                   Review order, limits, and decision checklist');
console.log('  portable-project/           Complete one-command, hashed design-system handoff');
console.log('  authoring-config.ts         Minimal public input that generated the bundle');
console.log('  tokens.css                  Atomic and semantic CSS contract');
console.log('  typography.generated.ts    Typed role/variant/style/weight contract');
console.log('  typography-specimen.html   Standalone visual and diagnostic specimen');
console.log('\nThe checked example contains metadata, not licensed font assets.');
console.log('Use the integrated tfs.config.ts project build for final real-font proof.');
