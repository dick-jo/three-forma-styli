import { fileURLToPath } from 'node:url';
import { prepareFonts, resolveSystem, type SystemInput } from 'three-forma-styli';
import everything from './fixtures/everything/tfs.config.js';

/** The everything-project, resolved and with its fonts prepared. */
export const project = fileURLToPath(new URL('./fixtures/everything/', import.meta.url));
export const config = everything;
export const system = config.system as unknown as SystemInput;
export const resolved = resolveSystem(system);
export const fonts = await prepareFonts(system.typography!, project);
