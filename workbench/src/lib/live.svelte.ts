import type { WorkbenchData } from 'three-forma-styli';

/**
 * Current data from `tfs dev`, refreshed whenever it signals a rebuild. The
 * generated CSS is reloaded too; `stamp` changes once it has applied, so
 * anything reading computed values knows to read again.
 */
export class Live {
	data = $state<WorkbenchData | undefined>();
	stamp = $state(0);

	connect(): void {
		void this.refresh();
		new EventSource('/events').onmessage = () => void this.refresh();
	}

	private async refresh(): Promise<void> {
		this.data = await (await fetch('/workbench.json')).json();
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = `/generated/styles.css?v=${Date.now()}`;
		link.onload = () => {
			document.querySelectorAll('link[data-tfs]').forEach((old) => old !== link && old.remove());
			this.stamp++;
		};
		link.dataset.tfs = '';
		document.head.append(link);
	}
}
