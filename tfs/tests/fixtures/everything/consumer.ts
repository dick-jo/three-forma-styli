// How an app uses the generated ./typography module; typecheck proves the types.
import { typographyClassName, type TypographySelection } from './expected/typography.js';

export const valid: TypographySelection[] = [
	{ role: 'label' },
	{ role: 'label', size: 's', weight: 'max', fontStyle: 'italic' },
	{ role: 'prose', size: 'max', fontStyle: 'italic' },
];

// @ts-expect-error heading offers only the normal style.
typographyClassName({ role: 'heading', fontStyle: 'italic' });
// @ts-expect-error label has no weight named bold.
typographyClassName({ role: 'label', weight: 'bold' });
// @ts-expect-error unknown role.
typographyClassName({ role: 'caption' });
