import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const runtimeDirectory = path.resolve(import.meta.dirname);

function valueDependencies(filePath: string): string[] {
	const source = fs.readFileSync(filePath, 'utf8');
	const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
	const dependencies: string[] = [];

	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement)) {
			if (statement.importClause?.isTypeOnly) continue;
			dependencies.push((statement.moduleSpecifier as ts.StringLiteral).text);
		}
		if (ts.isExportDeclaration(statement)) {
			if (statement.isTypeOnly || !statement.moduleSpecifier) continue;
			dependencies.push((statement.moduleSpecifier as ts.StringLiteral).text);
		}
	}

	return dependencies;
}

function resolveSourceImport(fromFile: string, specifier: string): string {
	return path.resolve(path.dirname(fromFile), specifier.replace(/\.js$/, '.ts'));
}

function portablePath(filePath: string): string {
	return filePath.split(path.sep).join('/');
}

describe('runtime bundle boundary', () => {
	it('has no external, Node-only, generator, transformer, typography or root imports', () => {
		const entry = path.join(runtimeDirectory, 'index.ts');
		const pending = [entry];
		const visited = new Set<string>();
		const externalImports: string[] = [];

		while (pending.length > 0) {
			const current = pending.pop()!;
			if (visited.has(current)) continue;
			visited.add(current);
			for (const dependency of valueDependencies(current)) {
				if (!dependency.startsWith('.')) {
					externalImports.push(dependency);
					continue;
				}
				pending.push(resolveSourceImport(current, dependency));
			}
		}

		expect(externalImports).toEqual([]);
		expect(
			[...visited]
				.map((file) => portablePath(path.relative(path.resolve(runtimeDirectory, '..'), file)))
				.sort()
		).toEqual([
			'color-css.ts',
			'constraints/luminance.ts',
			'runtime/index.ts',
			'runtime/theme.ts',
			'runtime/types.ts',
		]);
		expect([...visited].map(portablePath).join('\n')).not.toMatch(
			/(?:generator|transformers|typography|\/src\/index\.ts)/
		);
	});
});
