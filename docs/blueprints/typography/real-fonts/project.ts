import { axes } from '../../axes/separate-files/axes.js';
import { fontSize } from '../font-size.js';
import { fonts } from './fonts.js';
import { typography } from './typography.js';

// Blueprint assembly excerpt; output targets belong to the assembled-system review.
export const project = {
	fonts,
	system: {
		axes,
		fontSize,
		typography,
	},
};
