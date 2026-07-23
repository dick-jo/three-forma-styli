import type {
	MotionContract,
	ShadowContractLayer,
	TypographyContractRecipe,
} from '../generator/types.js';
import type { FontSizeReference } from '../types.js';

export type ReviewLabId =
	'overview' | 'color' | 'typography' | 'shadows' | 'motion' | 'foundations';
export type ReviewModeCategory = 'color' | 'size';

export interface ReviewAssetContract {
	/** URLs are relative to review/index.html. */
	stylesheets: string[];
}

export interface ReviewMode {
	name: string;
	isDefault: boolean;
	/** Complete inline overrides for the review canvas; the default mode is empty. */
	tokens: Record<string, string>;
}

export interface ReviewModeGroup {
	category: ReviewModeCategory;
	default: string;
	modes: ReviewMode[];
}

export interface ReviewNumberControl {
	kind: 'number';
	id: string;
	label: string;
	path: string;
	value: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
}

export interface ReviewSelectOption {
	label: string;
	value: string | number;
	/** Optional resolved preview value for selections represented by authored references. */
	css?: string;
}

export interface ReviewSelectControl {
	kind: 'select';
	id: string;
	label: string;
	path: string;
	value: string | number;
	options: ReviewSelectOption[];
}

export type ReviewControl = ReviewNumberControl | ReviewSelectControl;

export interface ReviewCapturePolicy {
	enabled: boolean;
	viewports: string[];
	colorModes: string[];
	sizeModes: string[];
}

export interface ReviewCaseBase {
	id: string;
	label: string;
	sourcePath: string;
	controls: ReviewControl[];
	capture: ReviewCapturePolicy;
}

export interface TypographyReviewCase extends ReviewCaseBase {
	kind: 'typography';
	/** Typography mode whose resolved recipe and authoring path this case represents. */
	mode: string;
	role: string;
	variant: string | null;
	font: {
		id: string;
		family: string;
		fallbacks: string[];
		adjustedFallback?: string;
	};
	style: string;
	weight: {
		alias: string;
		value: number;
	};
	availableStyles: string[];
	availableWeights: Array<{ alias: string; value: number }>;
	styleWeights: Record<string, Array<{ alias: string; value: number }>>;
	recipe: TypographyContractRecipe;
}

export interface TypographyReviewLab {
	kind: 'typography';
	id: 'typography';
	label: string;
	cases: TypographyReviewCase[];
}

export interface ShadowReviewCase extends ReviewCaseBase {
	kind: 'shadow';
	shadowKind: 'box' | 'text';
	recipe: string;
	variant: string | null;
	token: string;
	css: string;
	unit: string;
	layers: ShadowContractLayer[];
}

export interface ShadowReviewLab {
	kind: 'shadows';
	id: 'shadows';
	label: string;
	cases: ShadowReviewCase[];
}

export interface OverviewReviewLab {
	kind: 'overview';
	id: 'overview';
	label: string;
	summary: {
		tokenCount: number;
		colorModes: number;
		colorCases: number;
		sizeModes: number;
		typographyCases: number;
		shadowCases: number;
		motionCases: number;
		foundationCases: number;
	};
}

export interface ColorReviewCase extends ReviewCaseBase {
	kind: 'color';
	mode: string;
	color: string;
	token: string;
	css: string;
	value: { l: number; c: number; h: number };
	alphaVariants: Array<{ label: string; alpha: number; token: string; css: string }>;
}

export interface ColorReviewLab {
	kind: 'color';
	id: 'color';
	label: string;
	cases: ColorReviewCase[];
}

export interface MotionReviewCase extends ReviewCaseBase {
	kind: 'motion';
	recipe: string;
	variant: string | null;
	token: string;
	duration: { token: string | null; milliseconds: number };
	delay: { token: string | null; milliseconds: number };
	easing: {
		name: string;
		token: string;
		css: string;
		value: readonly [number, number, number, number];
	};
}

export interface MotionReviewLab {
	kind: 'motion';
	id: 'motion';
	label: string;
	cases: MotionReviewCase[];
}

export interface FoundationReviewCase extends ReviewCaseBase {
	kind: 'foundation';
	family: 'spacing' | 'gap' | 'borderRadius' | 'borderWidth' | 'time';
	tokens: Array<{ name: string; value: string; rawValue?: number; unit?: string }>;
}

export interface FoundationReviewLab {
	kind: 'foundation';
	id: 'foundations';
	label: string;
	cases: FoundationReviewCase[];
}

export type ReviewCase =
	| ColorReviewCase
	| TypographyReviewCase
	| ShadowReviewCase
	| MotionReviewCase
	| FoundationReviewCase;

export type ReviewLab =
	| OverviewReviewLab
	| ColorReviewLab
	| TypographyReviewLab
	| ShadowReviewLab
	| MotionReviewLab
	| FoundationReviewLab;

export interface ReviewDiagnostic {
	id: string;
	severity: 'info' | 'warning' | 'error';
	message: string;
	path?: string;
}

export interface TfsWorkbenchContract {
	kind: 'three-forma-styli/workbench';
	schemaVersion: 1;
	systemFingerprint: string;
	toolVersion: string;
	title: string;
	assets: ReviewAssetContract;
	globals: {
		modes: ReviewModeGroup[];
		viewports: Array<{ id: string; label: string; width: number; height: number }>;
	};
	labs: ReviewLab[];
	diagnostics: ReviewDiagnostic[];
	agent: {
		verification: {
			generate: string;
			check: string;
		};
	};
	motion?: MotionContract;
}

export interface WorkbenchDraftOperation {
	path: string;
	previous: string | number | boolean | null;
	value: string | number | boolean | null;
}

export interface TfsReviewPatch {
	kind: 'three-forma-styli/review-patch';
	schemaVersion: 1;
	systemFingerprint: string;
	operations: WorkbenchDraftOperation[];
	selectedCases: string[];
	note?: string;
}

/**
 * Tool-agnostic handoff for Codex, Claude, or another coding agent. TFS owns the
 * exact design delta and verification contract; the agent owns source-aware
 * edits and version-control operations.
 */
export interface TfsAgentHandoff {
	kind: 'three-forma-styli/agent-handoff';
	schemaVersion: 1;
	patch: TfsReviewPatch;
	instructions: string;
	verification: {
		generate: string;
		check: string;
	};
}

export interface WorkbenchContractOptions {
	title?: string;
	systemFingerprint: string;
	toolVersion: string;
	stylesheets: string[];
	adjustedFallbackFamilies?: Record<string, string>;
	verification?: {
		generate?: string;
		check?: string;
	};
}

export interface TypographySizeOption {
	label: string;
	value: FontSizeReference;
}
