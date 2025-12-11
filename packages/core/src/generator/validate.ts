/**
 * Input validation for DesignSystem and PartialDesignSystem
 *
 * Validates inputs at the generator entry point and throws helpful errors.
 */

import type { DesignSystem, PartialDesignSystem, AlphaSchedule } from '../types.js';

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Validates a complete DesignSystem, throwing on any invalid input
 */
export function validateDesignSystem(ds: DesignSystem): void {
	if (!ds) {
		throw new ValidationError('DesignSystem is required');
	}

	validateColors(ds);
	validateSpacing(ds);
	validateGap(ds);
	validateTypography(ds);
	validateBorder(ds);
	validateTime(ds);
}

/**
 * Validates a PartialDesignSystem, throwing on any invalid input.
 * Only validates the families that are provided.
 * Checks for dependency requirements (e.g., gap requires spacing).
 */
export function validatePartialDesignSystem(ds: DesignSystem | PartialDesignSystem): void {
	if (!ds) {
		throw new ValidationError('DesignSystem is required');
	}

	// Check that at least one family is provided
	const hasColors = !!ds.colors;
	const hasSpacing = !!ds.spacing;
	const hasGap = !!ds.gap;
	const hasTypography = !!ds.typography;
	const hasBorder = !!ds.border;
	const hasTime = !!ds.time;

	if (!hasColors && !hasSpacing && !hasGap && !hasTypography && !hasBorder && !hasTime) {
		throw new ValidationError('At least one token family must be provided');
	}

	// Check dependencies
	if (hasGap && !hasSpacing) {
		throw new ValidationError('Gap requires spacing (gap values reference spacing tokens)');
	}

	if (ds.border?.radius && !hasSpacing) {
		throw new ValidationError('Border radius requires spacing (radius values reference spacing tokens)');
	}

	// Validate each provided family
	if (hasColors) {
		validateColorsPartial(ds.colors!);
	}
	if (hasSpacing) {
		validateSpacingPartial(ds.spacing!);
	}
	if (hasGap) {
		validateGapPartial(ds.gap!);
	}
	if (hasTypography) {
		validateTypographyPartial(ds.typography!);
	}
	if (hasBorder) {
		validateBorderPartial(ds.border!);
	}
	if (hasTime) {
		validateTimePartial(ds.time!);
	}
}

function validateColorsPartial(colors: NonNullable<PartialDesignSystem['colors']>): void {
	if (!colors.modes || !Array.isArray(colors.modes)) {
		throw new ValidationError('colors.modes must be an array');
	}

	if (colors.modes.length === 0) {
		throw new ValidationError('colors.modes must have at least one mode');
	}

	colors.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Color mode at index ${index} must have a name`);
		}
		if (!mode.tokens || typeof mode.tokens !== 'object') {
			throw new ValidationError(`Color mode "${mode.name}" must have tokens`);
		}
	});

	if (colors.alphaSchedule) {
		validateAlphaSchedule(colors.alphaSchedule, 'colors.alphaSchedule');
	}

	colors.modes.forEach((mode) => {
		if (mode.alphaSchedule) {
			validateAlphaSchedule(mode.alphaSchedule, `colors.modes["${mode.name}"].alphaSchedule`);
		}
	});
}

function validateColors(ds: DesignSystem): void {
	if (!ds.colors) {
		throw new ValidationError('DesignSystem.colors is required');
	}
	validateColorsPartial(ds.colors);
}

function validateSpacingPartial(spacing: NonNullable<PartialDesignSystem['spacing']>): void {
	if (!spacing.modes || !Array.isArray(spacing.modes)) {
		throw new ValidationError('spacing.modes must be an array');
	}

	if (spacing.modes.length === 0) {
		throw new ValidationError('spacing.modes must have at least one mode');
	}

	spacing.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Spacing mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Spacing mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, range } = mode.tokens;

		if (!unit || typeof unit !== 'string') {
			throw new ValidationError(`Spacing mode "${mode.name}" must have a unit string`);
		}
		if (typeof base !== 'number' || base <= 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" base must be a positive number`);
		}
		if (typeof min !== 'number' || min < 0) {
			throw new ValidationError(`Spacing mode "${mode.name}" min must be a non-negative number`);
		}
		if (typeof range !== 'number' || range < 1 || !Number.isInteger(range)) {
			throw new ValidationError(`Spacing mode "${mode.name}" range must be a positive integer`);
		}
	});
}

function validateGapPartial(gap: NonNullable<PartialDesignSystem['gap']>): void {
	if (!gap.modes || !Array.isArray(gap.modes)) {
		throw new ValidationError('gap.modes must be an array');
	}

	if (gap.modes.length === 0) {
		throw new ValidationError('gap.modes must have at least one mode');
	}

	gap.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Gap mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Gap mode "${mode.name}" must have tokens`);
		}
	});
}

function validateTypographyPartial(typography: NonNullable<PartialDesignSystem['typography']>): void {
	if (!typography.modes || !Array.isArray(typography.modes)) {
		throw new ValidationError('typography.modes must be an array');
	}

	if (typography.modes.length === 0) {
		throw new ValidationError('typography.modes must have at least one mode');
	}

	typography.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Typography mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Typography mode "${mode.name}" must have tokens`);
		}

		const { unit, base, min, increment, range } = mode.tokens;

		if (!unit || typeof unit !== 'string') {
			throw new ValidationError(`Typography mode "${mode.name}" must have a unit string`);
		}
		if (typeof base !== 'number' || base <= 0) {
			throw new ValidationError(`Typography mode "${mode.name}" base must be a positive number`);
		}
		if (typeof min !== 'number' || min < 0) {
			throw new ValidationError(`Typography mode "${mode.name}" min must be a non-negative number`);
		}
		if (typeof increment !== 'number') {
			throw new ValidationError(`Typography mode "${mode.name}" increment must be a number`);
		}
		if (typeof range !== 'number' || range < 1 || !Number.isInteger(range)) {
			throw new ValidationError(`Typography mode "${mode.name}" range must be a positive integer`);
		}
	});
}

function validateBorderPartial(border: NonNullable<PartialDesignSystem['border']>): void {
	// Validate radius if present
	if (border.radius) {
		if (!border.radius.modes || !Array.isArray(border.radius.modes)) {
			throw new ValidationError('border.radius.modes must be an array');
		}

		if (border.radius.modes.length === 0) {
			throw new ValidationError('border.radius.modes must have at least one mode');
		}

		border.radius.modes.forEach((mode, index) => {
			if (!mode.name) {
				throw new ValidationError(`Border radius mode at index ${index} must have a name`);
			}
			if (!mode.tokens) {
				throw new ValidationError(`Border radius mode "${mode.name}" must have tokens`);
			}
		});
	}

	// Validate width if present
	if (border.width) {
		if (!border.width.modes || !Array.isArray(border.width.modes)) {
			throw new ValidationError('border.width.modes must be an array');
		}

		if (border.width.modes.length === 0) {
			throw new ValidationError('border.width.modes must have at least one mode');
		}

		border.width.modes.forEach((mode, index) => {
			if (!mode.name) {
				throw new ValidationError(`Border width mode at index ${index} must have a name`);
			}
			if (!mode.tokens) {
				throw new ValidationError(`Border width mode "${mode.name}" must have tokens`);
			}

			const { unit, value } = mode.tokens;

			if (!unit || typeof unit !== 'string') {
				throw new ValidationError(`Border width mode "${mode.name}" must have a unit string`);
			}
			if (typeof value !== 'number' || value < 0) {
				throw new ValidationError(`Border width mode "${mode.name}" value must be a non-negative number`);
			}
		});
	}
}

function validateTimePartial(time: NonNullable<PartialDesignSystem['time']>): void {
	if (!time.modes || !Array.isArray(time.modes)) {
		throw new ValidationError('time.modes must be an array');
	}

	if (time.modes.length === 0) {
		throw new ValidationError('time.modes must have at least one mode');
	}

	time.modes.forEach((mode, index) => {
		if (!mode.name) {
			throw new ValidationError(`Time mode at index ${index} must have a name`);
		}
		if (!mode.tokens) {
			throw new ValidationError(`Time mode "${mode.name}" must have tokens`);
		}

		validateTimeTokens(mode.tokens, `time.modes["${mode.name}"].tokens`);
	});
}

function validateAlphaSchedule(schedule: AlphaSchedule, path: string): void {
	const entries = Object.entries(schedule);

	if (entries.length === 0) {
		throw new ValidationError(`${path} must have at least one alpha level`);
	}

	for (const [level, value] of entries) {
		if (typeof value !== 'number') {
			throw new ValidationError(`${path}.${level} must be a number`);
		}
		if (value < 0 || value > 1) {
			throw new ValidationError(`${path}.${level} must be between 0 and 1 (got ${value})`);
		}
	}
}

function validateSpacing(ds: DesignSystem): void {
	if (!ds.spacing) {
		throw new ValidationError('DesignSystem.spacing is required');
	}
	validateSpacingPartial(ds.spacing);
}

function validateGap(ds: DesignSystem): void {
	if (!ds.gap) {
		throw new ValidationError('DesignSystem.gap is required');
	}
	validateGapPartial(ds.gap);
}

function validateTypography(ds: DesignSystem): void {
	if (!ds.typography) {
		throw new ValidationError('DesignSystem.typography is required');
	}
	validateTypographyPartial(ds.typography);
}

function validateBorder(ds: DesignSystem): void {
	if (!ds.border) {
		throw new ValidationError('DesignSystem.border is required');
	}

	// For full DesignSystem, both radius and width are required
	if (!ds.border.radius) {
		throw new ValidationError('DesignSystem.border.radius is required');
	}
	if (!ds.border.width) {
		throw new ValidationError('DesignSystem.border.width is required');
	}

	validateBorderPartial(ds.border);
}

function validateTime(ds: DesignSystem): void {
	if (!ds.time) {
		throw new ValidationError('DesignSystem.time is required');
	}
	validateTimePartial(ds.time);
}

function validateTimeTokens(tokens: { unit: string; base: number; min: number; range: number }, path: string): void {
	if (!tokens.unit || typeof tokens.unit !== 'string') {
		throw new ValidationError(`${path} must have a unit string`);
	}
	if (typeof tokens.base !== 'number' || tokens.base < 0) {
		throw new ValidationError(`${path}.base must be a non-negative number`);
	}
	if (typeof tokens.min !== 'number' || tokens.min < 0) {
		throw new ValidationError(`${path}.min must be a non-negative number`);
	}
	if (typeof tokens.range !== 'number' || tokens.range < 1 || !Number.isInteger(tokens.range)) {
		throw new ValidationError(`${path}.range must be a positive integer`);
	}
}
