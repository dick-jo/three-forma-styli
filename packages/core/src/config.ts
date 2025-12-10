import type { GeneratorConfig } from "./types.js";

// Default generator configuration
const defaultConfig = {
  global: {
    remToPxRatio: 16, // Conversion ratio for rem to px (used in calculations)
  },

  // CSS output configuration
  css: {
    // Variable name prefixes
    prefixes: {
      var: "--",           // CSS custom property prefix
      color: "clr",        // Color variables (--clr-primary)
      spacing: "sp",       // Spacing scale (--sp-1)
      gap: "gap",          // Gap system (--gap-s)
      typography: "fs",    // Font size (--fs-1)
      borderRadius: "bdr", // Border radius (--bdr-s)
      borderWidth: "bdw",  // Border width (--bdw)
      time: "t",           // Time/duration (--t-1)
    },

    // Separators for building variable names
    separators: {
      mode: "--",     // Mode prefixes (unused currently, for future multi-mode prefixing)
      modifier: "-",  // Modifiers like "-a-" for alpha/transparency
      value: "-",     // Value indicators like "-min", "-lo", "-hi"
    },

    // CSS selectors for output
    selectors: {
      root: ":root",                            // Default mode selector
      themeMode: '[data-theme-mode="{mode}"]',  // Override mode selector
    },

    // Color output formats
    colorFormats: {
      base: 'oklch' as const,      // Format for opaque colors
      alpha: 'oklch' as const,     // Format for transparent colors
      alphaModifier: 'a',          // Modifier for alpha variants (--clr-primary-a-min)
    },
  },
};

/**
 * Legacy export for backwards compatibility.
 * @deprecated Use mergeConfig() instead for configurable generation.
 */
export const transformerConfig = defaultConfig;

/**
 * Merges user config with default config.
 * User config takes precedence over defaults.
 */
export function mergeConfig(userConfig?: GeneratorConfig) {
  if (!userConfig) {
    return defaultConfig;
  }

  return {
    global: defaultConfig.global,
    css: {
      prefixes: {
        var: defaultConfig.css.prefixes.var,
        color: userConfig.prefixes?.color ?? defaultConfig.css.prefixes.color,
        spacing: userConfig.prefixes?.spacing ?? defaultConfig.css.prefixes.spacing,
        gap: userConfig.prefixes?.gap ?? defaultConfig.css.prefixes.gap,
        typography: userConfig.prefixes?.typography ?? defaultConfig.css.prefixes.typography,
        borderRadius: userConfig.prefixes?.borderRadius ?? defaultConfig.css.prefixes.borderRadius,
        borderWidth: userConfig.prefixes?.borderWidth ?? defaultConfig.css.prefixes.borderWidth,
        time: userConfig.prefixes?.time ?? defaultConfig.css.prefixes.time,
      },
      separators: {
        mode: defaultConfig.css.separators.mode,
        modifier: userConfig.separators?.modifier ?? defaultConfig.css.separators.modifier,
        value: userConfig.separators?.value ?? defaultConfig.css.separators.value,
      },
      selectors: {
        root: userConfig.selectors?.root ?? defaultConfig.css.selectors.root,
        themeMode: userConfig.selectors?.themeMode ?? defaultConfig.css.selectors.themeMode,
      },
      colorFormats: {
        base: userConfig.colorFormats?.base ?? defaultConfig.css.colorFormats.base,
        alpha: userConfig.colorFormats?.alpha ?? defaultConfig.css.colorFormats.alpha,
        alphaModifier: userConfig.colorFormats?.alphaModifier ?? defaultConfig.css.colorFormats.alphaModifier,
      },
    },
  };
}
