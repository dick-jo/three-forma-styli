import { defineTfsProject } from '../src/api.js';
import { defineTfsProject as defineFromProject } from '../src/project.js';
import { prepareFonts } from '../src/fonts/prepare.js';

const project = defineTfsProject({
	system: {},
	output: { directory: './dist', css: true },
});

const projectFromSubpath = defineFromProject({
	system: {},
	output: { directory: './dist', css: true },
});

void project;
void projectFromSubpath;
void prepareFonts;
