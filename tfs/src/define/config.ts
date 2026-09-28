/** tfs.config.ts: the assembled system, runtime options and where output goes. */
export type ConfigInput = {
	readonly system: Readonly<Record<string, unknown>>;
	readonly runtime?: {
		/** Colours customers may set in their own themes at runtime. */
		readonly colorThemes?: { readonly colors: readonly string[] };
	};
	readonly output?: {
		/** Relative to the config file. Default `./generated`. */
		readonly directory?: string;
		/** Also write generated/figma.json for the TFS Figma plugin. */
		readonly figma?: {
			/** Modes per axis to carry into Figma (4 per collection). Default: all. */
			readonly modes?: Readonly<Record<string, readonly string[]>>;
		};
	};
};

export function defineConfig<const T extends ConfigInput>(config: T): T {
	return config;
}
