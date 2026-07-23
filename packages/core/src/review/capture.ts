import type {
	ReviewCase,
	ReviewCaptureState,
	ReviewLabId,
	ReviewModeGroup,
	TfsReviewCapturePlan,
	TfsWorkbenchContract,
} from './types.js';

function idSegment(value: string): string {
	return Array.from(value)
		.map((character) =>
			/[A-Za-z0-9]/.test(character)
				? character
				: `_${character.codePointAt(0)!.toString(16).toUpperCase()}_`
		)
		.join('');
}

function reviewUrl(
	lab: ReviewLabId,
	caseId?: string,
	colorMode?: string,
	sizeMode?: string,
	motionPreference?: 'no-preference' | 'reduce'
): string {
	const entries = [
		['lab', lab],
		...(caseId ? [['case', caseId]] : []),
		['view', 'case'],
		...(colorMode ? [['color', colorMode]] : []),
		...(sizeMode ? [['size', sizeMode]] : []),
		...(motionPreference ? [['motion', motionPreference]] : []),
	];
	return `./index.html?${entries
		.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
		.join('&')}`;
}

function modesFor(
	group: ReviewModeGroup | undefined,
	requested: string[],
	caseId: string
): Array<string | undefined> {
	if (!group) return [undefined];
	const names = group.modes.map((mode) => mode.name);
	const resolved = requested.flatMap((name) => {
		if (name === '*') return names;
		if (name === '$default') return [group.default];
		if (!names.includes(name)) {
			throw new Error(`Review case "${caseId}" requests unknown ${group.category} mode "${name}"`);
		}
		return [name];
	});
	return [...new Set(resolved)];
}

function caseStates(
	contract: TfsWorkbenchContract,
	lab: Exclude<ReviewLabId, 'overview'>,
	reviewCase: ReviewCase
): ReviewCaptureState[] {
	if (!reviewCase.capture.enabled) return [];
	const colorGroup = contract.globals.modes.find((group) => group.category === 'color');
	const sizeGroup = contract.globals.modes.find((group) => group.category === 'size');
	const colorModes = modesFor(colorGroup, reviewCase.capture.colorModes, reviewCase.id);
	const sizeModes = modesFor(sizeGroup, reviewCase.capture.sizeModes, reviewCase.id);
	const motionPreferences: Array<'no-preference' | 'reduce' | undefined> =
		reviewCase.capture.motionPreferences.length > 0
			? reviewCase.capture.motionPreferences
			: [undefined];

	return reviewCase.capture.viewports.flatMap((viewportId) => {
		const viewport = contract.globals.viewports.find((entry) => entry.id === viewportId);
		if (!viewport) {
			throw new Error(`Review case "${reviewCase.id}" requests unknown viewport "${viewportId}"`);
		}
		return colorModes.flatMap((colorMode) =>
			sizeModes.flatMap((sizeMode) =>
				motionPreferences.map((motionPreference) => {
					const modeIdentity = [
						colorMode ? `color-${idSegment(colorMode)}` : undefined,
						sizeMode ? `size-${idSegment(sizeMode)}` : undefined,
						motionPreference ? `motion-${idSegment(motionPreference)}` : undefined,
					]
						.filter(Boolean)
						.join('--');
					return {
						id: [
							reviewCase.id,
							`viewport-${idSegment(viewport.id)}`,
							...(modeIdentity ? [modeIdentity] : []),
						].join('--'),
						lab,
						caseId: reviewCase.id,
						viewport: {
							id: viewport.id,
							width: viewport.width,
							height: viewport.height,
						},
						...(colorMode ? { colorMode } : {}),
						...(sizeMode ? { sizeMode } : {}),
						...(motionPreference ? { motionPreference } : {}),
						url: reviewUrl(lab, reviewCase.id, colorMode, sizeMode, motionPreference),
					};
				})
			)
		);
	});
}

/**
 * Expand Workbench capture policies into exact, framework-neutral browser states.
 *
 * The result deliberately contains no Playwright dependency. Any browser runner
 * can consume the committed JSON contract and own its screenshot/baseline policy.
 */
export function createReviewCapturePlan(contract: TfsWorkbenchContract): TfsReviewCapturePlan {
	const defaultViewport = contract.globals.viewports.find((viewport) => viewport.id === 'desktop');
	if (!defaultViewport) throw new Error('Review contract requires the built-in desktop viewport');
	const defaultColor = contract.globals.modes.find((group) => group.category === 'color')?.default;
	const defaultSize = contract.globals.modes.find((group) => group.category === 'size')?.default;
	const overview: ReviewCaptureState = {
		id: [
			'overview',
			`viewport-${idSegment(defaultViewport.id)}`,
			...(defaultColor ? [`color-${idSegment(defaultColor)}`] : []),
			...(defaultSize ? [`size-${idSegment(defaultSize)}`] : []),
		].join('--'),
		lab: 'overview',
		viewport: {
			id: defaultViewport.id,
			width: defaultViewport.width,
			height: defaultViewport.height,
		},
		...(defaultColor ? { colorMode: defaultColor } : {}),
		...(defaultSize ? { sizeMode: defaultSize } : {}),
		url: reviewUrl('overview', undefined, defaultColor, defaultSize),
	};
	const states = [
		overview,
		...contract.labs.flatMap((lab) => {
			if (lab.kind === 'overview') return [];
			return lab.cases.flatMap((reviewCase) => caseStates(contract, lab.id, reviewCase));
		}),
	];
	const duplicate = states.find(
		(state, index) => states.findIndex((candidate) => candidate.id === state.id) !== index
	);
	if (duplicate) throw new Error(`Review capture state ID "${duplicate.id}" is not unique`);
	return {
		kind: 'three-forma-styli/review-captures',
		schemaVersion: 2,
		systemFingerprint: contract.systemFingerprint,
		entrypoint: './index.html',
		states,
	};
}
