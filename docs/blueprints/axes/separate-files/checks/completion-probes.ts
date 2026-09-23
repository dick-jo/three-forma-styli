/** Cursor targets for the TypeScript language-service review, not authored domain data. */
import type { axes } from '../axes.js';
import type { colors } from '../color.js';
import type { alpha } from '../alpha.js';
import type { ColorIdentity, AlphaIdentity } from '../support/authoring.js';

export const axisName: keyof typeof axes = 'theme';
export const sizeMode: (typeof axes)['size']['modes'][number] = 'regular';
export const themeMode: (typeof axes)['theme']['modes'][number] = 'light';
export const colorName: ColorIdentity<typeof colors> = 'shd';
export const alphaPosition: AlphaIdentity<typeof alpha> = 'lo';
