/** One disposable tweak: what it changes in the preview, and how to describe it. */
export type Change = {
	readonly key: string;
	readonly label: string;
	readonly from: string;
	readonly to: string;
	readonly vars: Readonly<Record<string, string>>;
};

/** Tweaks made with sliders. Preview only: never saved, gone on reload. */
export class Changes {
	list = $state<Change[]>([]);
	vars = $derived(
		Object.assign({}, ...this.list.map((change) => change.vars)) as Record<string, string>
	);

	set(change: Change): void {
		const index = this.list.findIndex((existing) => existing.key === change.key);
		if (index === -1) this.list.push(change);
		// Keep the original "from" so the tray shows before → after, not step by step.
		else this.list[index] = { ...change, from: this.list[index]!.from };
	}

	reset(): void {
		this.list = [];
	}

	text(): string {
		return this.list.map((change) => `${change.label}: ${change.from} → ${change.to}`).join('\n');
	}
}
