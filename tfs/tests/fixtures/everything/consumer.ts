// How an app uses the generated ./typography and ./tokens modules; typecheck proves the types.
import { axes, cssVar, type ColorGroup, type Mode } from './expected/tokens.js';
import { typographyClassName, type TypographySelection } from './expected/typography.js';

// ---- ./tokens ----

type Accent = ColorGroup<'accents'>;
export const accent: Accent = 'duo';
// @ts-expect-error neu is not an accent.
export const notAccent: Accent = 'neu';

export const light: Mode<'theme'> = 'light';
// @ts-expect-error xl is not a size mode.
export const xl: Mode<'size'> = 'xl';
export const themeAttribute: 'data-theme-mode' = axes.theme.attribute;

cssVar('clr-pri-a-lo');
cssVar('text-label-s');
// @ts-expect-error no such token.
cssVar('clr-pri-a-half');

// ---- ./typography ----

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
