import { DesignSystem } from "../types";
import { lchToHex, applyTransparency } from "../utils";
import { transformerConfig } from "./config";
import { getDefaultMode, normalizeColorModes, writeJsonFile } from "./utils";

// UTILS ------------------------------------------------ //
function createFigmaToken(
  type: keyof typeof transformerConfig.figma.templates,
  value: string,
  options: {
    description?: string;
    extensions?: Record<string, any>;
  } = {},
): Record<string, any> {
  const { templates } = transformerConfig.figma;
  const baseToken = {
    ...templates[type],
    $value: value,
  };

  // Add description if provided
  if (options.description) {
    baseToken.$description = options.description;
  }

  return baseToken;
}

function convertToFigmaUnit(value: number, unit: string): string {
  const { remToPxRatio } = transformerConfig.global;

  // If unit is rem, convert to px for Figma
  if (unit === "rem") {
    const pxValue = value * remToPxRatio;
    // Format px value, removing unnecessary trailing zeros
    return `${pxValue.toFixed(2).replace(/\.?0+$/, "")}px`;
  }

  // For all other units, use as is
  return `${value.toFixed(4).replace(/\.?0+$/, "")}${unit}`;
}

// COLOUR ----------------------------------------------- //
function generateColorTokens(
  colors: DesignSystem["colors"],
): Record<string, Record<string, any>> {
  // Normalize the color modes first
  const normalizedColors = normalizeColorModes(colors);

  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;

  // Process each color mode - using normalizedColors
  normalizedColors.modes.forEach((mode) => {
    const tokens: Record<string, any> = {};

    // Process each color token
    Object.entries(mode.tokens).forEach(([colorName, color]) => {
      // Convert hyphens to dots for Figma hierarchical structure
      const figmaColorName = colorName.replace(/-/g, ".");

      // Create the base color entry
      const tokenName = `${tokenPrefixes.color}.${figmaColorName}`;

      tokens[tokenName] = createFigmaToken("color", lchToHex(color));

      // Process transparency variants - using normalizedColors
      const transparencySchedule =
        mode.transparencySchedule || normalizedColors.transparencySchedule;

      Object.entries(transparencySchedule).forEach(([level, alpha]) => {
        // Handle hyphens in level names too
        const figmaLevel = level.replace(/-/g, ".");

        const trTokenName = `${tokenPrefixes.color}.${figmaColorName}.tr.${figmaLevel}`;

        tokens[trTokenName] = createFigmaToken(
          "color",
          applyTransparency(color, alpha),
        );
      });
    });

    // Add to tokens by mode
    tokensByMode[mode.name] = tokens;
  });

  return tokensByMode;
}

// SPACING ---------------------------------------------- //
function generateSpacingTokens(
  spacing: DesignSystem["spacing"],
): Record<string, Record<string, any>> {
  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;

  // Process each spacing mode
  spacing.modes.forEach((mode) => {
    const tokens: Record<string, any> = {};
    const spacingSystem = mode.tokens;

    // Generate minimum spacing token
    const minTokenName = `${tokenPrefixes.spacing}.min`;
    tokens[minTokenName] = createFigmaToken(
      "dimension",
      convertToFigmaUnit(spacingSystem.min, spacingSystem.unit),
    );

    // Generate spacing range tokens
    for (let i = 1; i <= spacingSystem.range; i++) {
      const tokenName = `${tokenPrefixes.spacing}.${i}`;
      tokens[tokenName] = createFigmaToken(
        "dimension",
        convertToFigmaUnit(spacingSystem.base * i, spacingSystem.unit),
      );
    }

    // Add to tokens by mode
    tokensByMode[mode.name] = tokens;
  });

  return tokensByMode;
}

// GAP -------------------------------------------------- //
function generateGapTokens(
  gap: DesignSystem["gap"],
  spacing: DesignSystem["spacing"],
): Record<string, Record<string, any>> {
  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;
  const defaultSpacingMode = getDefaultMode(spacing.modes);

  // Process each gap mode
  gap.modes.forEach((gapMode) => {
    const tokens: Record<string, any> = {};
    const gapSystem = gapMode.tokens;

    // Find the specified spacing mode or use default
    const spacingModeName = gapSystem.spacingMode || defaultSpacingMode.name;
    const spacingMode =
      spacing.modes.find((m) => m.name === spacingModeName) ||
      defaultSpacingMode;
    const spacingSystem = spacingMode.tokens;

    // Determine unit (use gap unit if specified, otherwise spacing unit)
    const unit = gapSystem.unit || spacingSystem.unit;

    // Helper function to resolve a gap value
    const resolveGapValue = (value: number | "min") => {
      if (value === "min") return spacingSystem.min;
      return value * spacingSystem.base;
    };

    // Dynamically process all properties in the gap config
    // Exclude non-gap properties like 'unit' and 'spacingMode'
    const nonGapProps = ["unit", "spacingMode"];

    Object.entries(gapSystem).forEach(([key, value]) => {
      // Skip non-gap properties
      if (nonGapProps.includes(key)) return;

      // Process gap value
      const resolvedValue = resolveGapValue(value as number | "min");
      const tokenName = `${tokenPrefixes.gap}.${key}`;

      tokens[tokenName] = createFigmaToken(
        "dimension",
        convertToFigmaUnit(resolvedValue, unit),
      );
    });

    // Add to tokens by mode
    tokensByMode[gapMode.name] = tokens;
  });

  return tokensByMode;
}

// TYPOGRAPHY ------------------------------------------- //
function generateTypographyTokens(
  typography: DesignSystem["typography"],
): Record<string, Record<string, any>> {
  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;
  const { remToPxRatio } = transformerConfig.global;

  // Process each typography mode
  typography.modes.forEach((mode) => {
    const tokens: Record<string, any> = {};
    const typographySystem = mode.tokens;

    // Helper function to convert rem to px if needed
    const formatDimension = (value: number, unit: string): string => {
      // If unit is rem, convert to px for Figma
      if (unit === "rem") {
        const pxValue = value * remToPxRatio;
        // Format px value, removing unnecessary trailing zeros
        return `${pxValue.toFixed(2).replace(/\.?0+$/, "")}px`;
      }
      // For other units, use as is
      return `${value.toFixed(4).replace(/\.?0+$/, "")}${unit}`;
    };

    // Generate min font size token
    const minTokenName = `${tokenPrefixes.typography}.min`;
    tokens[minTokenName] = createFigmaToken(
      "dimension",
      formatDimension(typographySystem.min, typographySystem.unit),
      {
        description: "Minimum font size",
      },
    );

    // Generate font sizes:
    // --fs-1 = base
    // --fs-2 = base + increment
    // --fs-3 = base + (increment * 2)
    // ...
    for (let i = 1; i <= typographySystem.range; i++) {
      // For i=1, use base; for i>1, use base + increment*(i-1)
      const fontSize =
        i === 1
          ? typographySystem.base
          : typographySystem.base + typographySystem.increment * (i - 1);

      const tokenName = `${tokenPrefixes.typography}.${i}`;

      tokens[tokenName] = createFigmaToken(
        "dimension",
        formatDimension(fontSize, typographySystem.unit),
        {
          description: i === 1 ? "Base font size" : `Font size level ${i}`,
        },
      );
    }

    // Add to tokens by mode
    tokensByMode[mode.name] = tokens;
  });

  return tokensByMode;
}

// BORDER: Radius --------------------------------------- //
function generateBorderRadiusTokens(
  border: DesignSystem["border"],
  spacing: DesignSystem["spacing"],
): Record<string, Record<string, any>> {
  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;
  const defaultSpacingMode = getDefaultMode(spacing.modes);

  // Process each border radius mode
  border.radius.modes.forEach((borderRadiusMode) => {
    const tokens: Record<string, any> = {};
    const borderRadiusSystem = borderRadiusMode.tokens;

    // Find the specified spacing mode or use default
    const spacingModeName =
      borderRadiusSystem.spacingMode || defaultSpacingMode.name;
    const spacingMode =
      spacing.modes.find((m) => m.name === spacingModeName) ||
      defaultSpacingMode;
    const spacingSystem = spacingMode.tokens;

    // Determine unit (use border radius unit if specified, otherwise spacing unit)
    const unit = borderRadiusSystem.unit || spacingSystem.unit;

    // Helper function to resolve a border radius value
    const resolveBorderRadiusValue = (value: number | "min") => {
      if (value === "min") return spacingSystem.min;
      return value * spacingSystem.base;
    };

    // Dynamically process all properties in the border radius config
    // Exclude non-border radius properties like 'unit' and 'spacingMode'
    const nonBorderRadiusProps = ["unit", "spacingMode"];

    Object.entries(borderRadiusSystem).forEach(([key, value]) => {
      // Skip non-border radius properties
      if (nonBorderRadiusProps.includes(key)) return;

      // Process border radius value
      const resolvedValue = resolveBorderRadiusValue(value as number | "min");
      const tokenName = `${tokenPrefixes.borderRadius}.${key}`;

      // Create token with descriptions for better documentation
      const description =
        key === "min"
          ? "Minimum border radius"
          : key === "s"
            ? "Small border radius"
            : key === "l"
              ? "Large border radius"
              : key === "max"
                ? "Maximum border radius"
                : `Border radius - ${key}`;

      tokens[tokenName] = {
        ...createFigmaToken(
          "dimension",
          convertToFigmaUnit(resolvedValue, unit),
        ),
        $description: description,
      };
    });

    // Add to tokens by mode
    tokensByMode[borderRadiusMode.name] = tokens;
  });

  return tokensByMode;
}

// BORDER: Width ---------------------------------------- //
function generateBorderWidthTokens(
  border: DesignSystem["border"],
): Record<string, Record<string, any>> {
  const tokensByMode: Record<string, Record<string, any>> = {};
  const { tokenPrefixes } = transformerConfig.figma;

  // Process each border width mode
  border.width.modes.forEach((borderWidthMode) => {
    const tokens: Record<string, any> = {};
    const borderWidthSystem = borderWidthMode.tokens;

    // Create the token
    const tokenName = `${tokenPrefixes.borderWidth}`;

    // For figma, we still need to convert to Figma-friendly unit if needed
    const formattedValue =
      borderWidthSystem.unit === "rem"
        ? convertToFigmaUnit(borderWidthSystem.value, borderWidthSystem.unit)
        : `${borderWidthSystem.value}${borderWidthSystem.unit}`;

    tokens[tokenName] = createFigmaToken("dimension", formattedValue, {
      description: "Border width",
    });

    // Add to tokens by mode
    tokensByMode[borderWidthMode.name] = tokens;
  });

  return tokensByMode;
}

// MANIFEST --------------------------------------------- //
function generateManifest(designSystem: DesignSystem): Record<string, any> {
  const { collections, filePrefix } = transformerConfig.figma;

  // Create manifest structure
  const manifest = {
    name: "Three Forma Styli",
    collections: {
      [collections.color]: {
        modes: {} as Record<string, string[]>,
      },
      [collections.spacing]: {
        modes: {} as Record<string, string[]>,
      },
      [collections.gap]: {
        modes: {} as Record<string, string[]>,
      },
      [collections.typography]: {
        modes: {} as Record<string, string[]>,
      },
      [collections.borderRadius]: {
        modes: {} as Record<string, string[]>,
      },
      [collections.borderWidth]: {
        modes: {} as Record<string, string[]>,
      },
    },
  };

  // Add color modes to manifest
  designSystem.colors.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.color].modes[modeName] = [
      `${filePrefix.color}.${mode.name}.tokens.json`,
    ];
  });

  // Add spacing modes to manifest
  designSystem.spacing.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.spacing].modes[modeName] = [
      `${filePrefix.spacing}.${mode.name}.tokens.json`,
    ];
  });

  // Add gap modes to manifest
  designSystem.gap.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.gap].modes[modeName] = [
      `${filePrefix.gap}.${mode.name}.tokens.json`,
    ];
  });

  // Add typography modes to manifest
  designSystem.typography.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.typography].modes[modeName] = [
      `${filePrefix.typography}.${mode.name}.tokens.json`,
    ];
  });

  // Add border radius modes to manifest
  designSystem.border.radius.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.borderRadius].modes[modeName] = [
      `${filePrefix.borderRadius}.${mode.name}.tokens.json`,
    ];
  });

  // Add border width modes to manifest
  designSystem.border.width.modes.forEach((mode) => {
    const modeName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
    manifest.collections[collections.borderWidth].modes[modeName] = [
      `${filePrefix.borderWidth}.${mode.name}.tokens.json`,
    ];
  });

  return manifest;
}

// OUTPUT ----------------------------------------------- //
export async function generateFigmaTokens(
  designSystem: DesignSystem,
  outputDir: string,
): Promise<void> {
  const { filePrefix } = transformerConfig.figma;

  // Generate color tokens and write files
  const colorTokens = generateColorTokens(designSystem.colors);
  for (const [modeName, tokens] of Object.entries(colorTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.color}.${modeName}.tokens.json`,
    );
  }

  // Generate spacing tokens and write files
  const spacingTokens = generateSpacingTokens(designSystem.spacing);
  for (const [modeName, tokens] of Object.entries(spacingTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.spacing}.${modeName}.tokens.json`,
    );
  }

  // Generate gap tokens and write files
  const gapTokens = generateGapTokens(designSystem.gap, designSystem.spacing);
  for (const [modeName, tokens] of Object.entries(gapTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.gap}.${modeName}.tokens.json`,
    );
  }

  // Generate typography tokens and write files
  const typographyTokens = generateTypographyTokens(designSystem.typography);
  for (const [modeName, tokens] of Object.entries(typographyTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.typography}.${modeName}.tokens.json`,
    );
  }

  // Generate border radius tokens and write files
  const borderRadiusTokens = generateBorderRadiusTokens(
    designSystem.border,
    designSystem.spacing,
  );
  for (const [modeName, tokens] of Object.entries(borderRadiusTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.borderRadius}.${modeName}.tokens.json`,
    );
  }

  // Generate border width tokens and write files
  const borderWidthTokens = generateBorderWidthTokens(designSystem.border);
  for (const [modeName, tokens] of Object.entries(borderWidthTokens)) {
    await writeJsonFile(
      tokens,
      outputDir,
      `${filePrefix.borderWidth}.${modeName}.tokens.json`,
    );
  }

  // Update manifest to include all token types
  const manifest = generateManifest(designSystem);
  await writeJsonFile(manifest, outputDir, "manifest.json");
}
