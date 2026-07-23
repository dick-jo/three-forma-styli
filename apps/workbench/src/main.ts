import { mount } from 'svelte';
import type { TfsWorkbenchContract } from '@three-forma-styli/core';
import App from './App.svelte';
import './workbench.css';

async function loadContract(): Promise<TfsWorkbenchContract> {
	const response = await fetch('./workbench.json', { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Unable to load workbench contract (${response.status})`);
	}
	const value: unknown = await response.json();
	if (
		!value ||
		typeof value !== 'object' ||
		(value as { kind?: unknown }).kind !== 'three-forma-styli/workbench' ||
		(value as { schemaVersion?: unknown }).schemaVersion !== 1
	) {
		throw new Error('Unsupported TFS workbench contract');
	}
	return value as TfsWorkbenchContract;
}

const target = document.querySelector<HTMLElement>('#tfs-workbench');
if (!target) throw new Error('TFS workbench mount point is missing');

function loadStylesheet(href: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.tfsReviewAsset = '';
		link.addEventListener('load', () => resolve(), { once: true });
		link.addEventListener('error', () => reject(new Error(`Unable to load stylesheet: ${href}`)), {
			once: true,
		});
		document.head.append(link);
	});
}

async function start(): Promise<void> {
	try {
		const contract = await loadContract();
		await Promise.all(contract.assets.stylesheets.map(loadStylesheet));
		document.title = contract.title;
		mount(App, { target: target!, props: { contract } });
		await document.fonts.ready;
		document.documentElement.dataset.tfsWorkbenchReady = 'true';
	} catch (error) {
		target!.innerHTML = `<main class="fatal"><strong>Workbench unavailable</strong><pre></pre></main>`;
		const pre = target!.querySelector('pre');
		if (pre) pre.textContent = error instanceof Error ? error.message : String(error);
		throw error;
	}
}

void start();
