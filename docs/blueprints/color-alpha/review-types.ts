/** Review-only declarations; no new public TFS authoring API. */
import type { AlphaSystem, IdentityGroup } from '@three-forma-styli/core';
import type {
	AxisCatalogue,
	ColorDraft as ModeColorDraft,
} from '../axes/separate-files/support/authoring.js';

export type ColorDraft<
	Axes extends AxisCatalogue,
	Alpha extends AlphaSystem,
> = ModeColorDraft<Axes> & {
	readonly alphaScale?: Extract<keyof Alpha['scales'], string>;
	readonly groups?: Readonly<Record<string, IdentityGroup>>;
};
