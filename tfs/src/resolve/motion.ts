import type { SystemInput } from './input.js';
import type { Issues } from './issues.js';
import { checkIdentity, checkIncreasing, isFiniteNumber } from './rules.js';

import { LO_HI_POSITIONS, TIME_UNITS } from '../const.js';

function checkTimeScale(
	issues: Issues,
	path: string,
	scale: { unit: string; values: Readonly<Record<string, number>> }
): void {
	issues.check(
		(TIME_UNITS as readonly string[]).includes(scale.unit),
		`${path}.unit`,
		`must be ms or s`
	);
	const entries = LO_HI_POSITIONS.map((position) => [position, scale.values[position]] as const);
	for (const [position, value] of entries) {
		issues.check(
			isFiniteNumber(value) && value >= 0,
			`${path}.values.${position}`,
			`is required and must be 0 or more`
		);
	}
	if (entries.every(([, value]) => isFiniteNumber(value))) {
		checkIncreasing(issues, `${path}.values`, entries as unknown as [string, number][]);
	}
}

export function checkTime(issues: Issues, time: NonNullable<SystemInput['time']>): void {
	checkTimeScale(issues, 'time', time);
	for (const [name, scale] of Object.entries(time.scales ?? {})) {
		checkIdentity(issues, `time.scales.${name}`, name);
		checkTimeScale(issues, `time.scales.${name}`, scale);
	}
}

export function checkEasings(issues: Issues, easings: NonNullable<SystemInput['easings']>): void {
	for (const [name, easing] of Object.entries(easings)) {
		const path = `easings.${name}`;
		checkIdentity(issues, path, name);
		if (easing.type === 'cubicBezier') {
			const [x1, y1, x2, y2] = easing.value;
			const finite = [x1, y1, x2, y2].every(isFiniteNumber) && easing.value.length === 4;
			issues.check(finite, path, `needs four finite numbers`);
			issues.check(
				x1! >= 0 && x1! <= 1 && x2! >= 0 && x2! <= 1,
				path,
				`x1 and x2 must be between 0 and 1`
			);
		} else if (easing.type === 'linear') {
			const points = easing.value;
			issues.check(points.length >= 2, path, `needs at least two points`);
			points.forEach((point, index) => {
				const [input, output] = point;
				issues.check(
					point.length === 2 && isFiniteNumber(input) && isFiniteNumber(output),
					`${path}[${index}]`,
					`must be [input, output] numbers`
				);
				issues.check(
					input! >= 0 && input! <= 1,
					`${path}[${index}]`,
					`input must be between 0 and 1`
				);
				if (index > 0)
					issues.check(
						input! >= points[index - 1]![0]!,
						`${path}[${index}]`,
						`inputs must not go backwards`
					);
			});
		} else {
			issues.add(path, `must be made with cubicBezier() or linear()`);
		}
	}
}
