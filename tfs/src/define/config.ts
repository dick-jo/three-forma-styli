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
	};
};

export function defineConfig<const T extends ConfigInput>(config: T): T {
	return config;
}
