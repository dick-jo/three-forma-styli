// src/transformers/config.ts
export const transformerConfig = {
  global: {
    remToPxRatio: 16,
  },
  // CSS output configuration
  css: {
    prefixes: {
      var: "--",
      color: "clr",
      spacing: "sp",
      gap: "gap",
      typography: "fs", // Font size prefix
      borderRadius: "bdr", // Border radius prefix
      borderWidth: "bdw", // Border width prefix
      time: "t", // Time prefix
    },
    separators: {
      mode: "--", // For mode prefixes like "--dark--"
      modifier: "-", // For modifiers like "-tr-"
      value: "-", // For value indicators like "-min"
    },
    selectors: {
      root: ":root",
      themeMode: '[data-theme-mode="{mode}"]', // {mode} will be replaced
    },
    rootSelector: ":root", // CSS selector for root variables
  },

  // JSON output configuration
  json: {
    spaces: 2, // Indentation spaces for JSON output
  },

  // Figma output configuration
  figma: {
    // File naming
    filePrefix: {
      color: "colors",
      spacing: "spacing",
      gap: "gap",
      typography: "typography",
      borderRadius: "border.radius",
      borderWidth: "border.width",
    },

    // Collection names in Figma
    collections: {
      color: "Colors",
      spacing: "Spacing",
      gap: "Gap",
      typography: "Typography",
      borderRadius: "Border Radius",
      borderWidth: "Border Width",
    },

    // Token templates with types
    templates: {
      color: {
        $type: "color",
        $description: "Color token",
        $value: "", // To be filled
      },
      dimension: {
        $type: "dimension",
        $description: "Dimension token",
        $value: "", // To be filled
      },
    },

    // Token prefixes for naming
    tokenPrefixes: {
      color: "clr",
      spacing: "sp",
      gap: "gap",
      typography: "fs",
      borderRadius: "bdr",
      borderWidth: "bdw",
    },
  },
};
