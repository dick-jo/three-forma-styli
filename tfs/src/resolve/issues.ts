/** One problem, located by its path in the authored system. */
export type Issue = { readonly path: string; readonly message: string };

/** Thrown when the system is invalid; carries every problem found, not just the first. */
export class TfsError extends Error {
	readonly issues: readonly Issue[];
	constructor(issues: readonly Issue[]) {
		super(
			`${issues.length} problem${issues.length === 1 ? '' : 's'} in the design system:\n` +
				issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n')
		);
		this.name = 'TfsError';
		this.issues = issues;
	}
}

/** Collects issues while checking. */
export class Issues {
	readonly list: Issue[] = [];

	add(path: string, message: string): void {
		this.list.push({ path, message });
	}

	/** Records the message when the condition fails; returns the condition. */
	check(condition: boolean, path: string, message: string): boolean {
		if (!condition) this.add(path, message);
		return condition;
	}
}
