import type { TypographyContract } from '../generator/types.js';

export interface TypographyRoleClassKeys {
	sizes: Record<string, string>;
	variants: Record<string, string>;
	styleWeights: Record<string, Record<string, string>>;
}

/** One canonical class-key grammar shared by CSS, declarations and typed contracts. */
export function typographyRoleClassKeys(
	contract: TypographyContract
): Record<string, TypographyRoleClassKeys> {
	return Object.fromEntries(
		Object.entries(contract.roles).map(([roleName, role]) => [
			roleName,
			{
				sizes: Object.fromEntries(
					Object.keys(role.sizes).map((size) => [
						size,
						size === 'base' ? roleName : `${roleName}-${size}`,
					])
				),
				variants: Object.fromEntries(
					Object.keys(role.variants).map((variant) => [variant, `${roleName}-variant-${variant}`])
				),
				styleWeights: Object.fromEntries(
					Object.entries(role.styles).map(([style, capability]) => [
						style,
						Object.fromEntries(
							capability!.weights.map((weight) => [
								weight,
								`${roleName}-style-${style}-weight-${weight}`,
							])
						),
					])
				),
			},
		])
	);
}

export function typographyClassKeys(contract: TypographyContract): string[] {
	return Object.values(typographyRoleClassKeys(contract)).flatMap((role) => [
		...Object.values(role.sizes),
		...Object.values(role.variants),
		...Object.values(role.styleWeights).flatMap((weights) => Object.values(weights)),
	]);
}
