// In src/transformers/css.ts
import {
  BorderRadiusMode,
  BorderWidthMode,
  ColorMode,
  DesignSystem,
  GapMode,
  SpacingMode,
  TimeMode,
  TransparencySchedule,
  TypographyMode,
} from "../types";
import { lchToHex, applyTransparency } from "../utils";
import { transformerConfig } from "./config";
import {
  generateCssVar,
  normalizeColorModes,
  separateDefaultAndOverrides,
} from "./utils";

// UTILS ------------------------------------------------ //
function collectOverridesByModeName(
  designSystem: DesignSystem,
): Record<string, any> {
  const overridesByMode: Record<string, any> = {};

  // Collect color overrides
  const { overrideModes: colorOverrides } = separateDefaultAndOverrides(
    designSystem.colors.modes,
  );
  colorOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].colors = mode;
  });

  // Collect spacing overrides
  const { overrideModes: spacingOverrides } = separateDefaultAndOverrides(
    designSystem.spacing.modes,
  );
  spacingOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].spacing = mode;
  });

  // Collect gap overrides
  const { overrideModes: gapOverrides } = separateDefaultAndOverrides(
    designSystem.gap.modes,
  );
  gapOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].gap = mode;
  });

  // Collect typography overrides
  const { overrideModes: typographyOverrides } = separateDefaultAndOverrides(
    designSystem.typography.modes,
  );
  typographyOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].typography = mode;
  });

  // Collect border radius overrides
  const { overrideModes: borderRadiusOverrides } = separateDefaultAndOverrides(
    designSystem.border.radius.modes,
  );
  borderRadiusOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].borderRadius = mode;
  });

  // Collect border width overrides
  const { overrideModes: borderWidthOverrides } = separateDefaultAndOverrides(
    designSystem.border.width.modes,
  );
  borderWidthOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].borderWidth = mode;
  });

  // Collect time overrides
  const { overrideModes: timeOverrides } = separateDefaultAndOverrides(
    designSystem.time.modes,
  );
  timeOverrides.forEach((mode) => {
    if (!overridesByMode[mode.name]) overridesByMode[mode.name] = {};
    overridesByMode[mode.name].time = mode;
  });

  return overridesByMode;
}

// COLOURS ---------------------------------------------- //
function generateColorVarsForMode(
  mode: ColorMode & { name: string },
  transparencySchedule: TransparencySchedule,
): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];

  Object.entries(mode.tokens).forEach(([colorName, color]) => {
    // Generate the base color variable
    cssVars.push(
      generateCssVar({
        prefix: prefixes.color,
        tokenName: colorName,
        value: lchToHex(color),
        separators,
        varPrefix: prefixes.var,
      }),
    );

    // Generate transparency variants for this color
    Object.entries(transparencySchedule).forEach(([level, alpha]) => {
      cssVars.push(
        generateCssVar({
          prefix: prefixes.color,
          tokenName: colorName,
          modifier: "tr",
          valueIndicator: level,
          value: applyTransparency(color, alpha),
          separators,
          varPrefix: prefixes.var,
        }),
      );
    });
  });

  return cssVars;
}

// SPACING ---------------------------------------------- //
function generateSpacingVarsForMode(
  mode: SpacingMode & { name: string },
): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];
  const spacingSystem = mode.tokens;

  // Generate the minimum spacing variable
  cssVars.push(
    generateCssVar({
      prefix: prefixes.spacing,
      tokenName: "min",
      value: `${spacingSystem.min}${spacingSystem.unit}`,
      separators,
      varPrefix: prefixes.var,
    }),
  );

  // Generate the spacing range variables
  for (let i = 1; i <= spacingSystem.range; i++) {
    cssVars.push(
      generateCssVar({
        prefix: prefixes.spacing,
        tokenName: i.toString(),
        value: `${spacingSystem.base * i}${spacingSystem.unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  }

  return cssVars;
}

// GAPS ------------------------------------------------- //
function generateGapVarsForMode(
  gapMode: GapMode & { name: string },
  spacingMode: SpacingMode & { name: string },
): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];
  const gapSystem = gapMode.tokens;
  const spacingSystem = spacingMode.tokens;

  // Determine unit (use gap unit if specified, otherwise spacing unit)
  const unit = gapSystem.unit || spacingSystem.unit;

  // Helper function to resolve a gap value
  const resolveGapValue = (value: number | "min") => {
    if (value === "min") return spacingSystem.min;
    return value * spacingSystem.base;
  };

  // Dynamically process all properties in the gap config
  const nonGapProps = ["unit", "spacingMode"];

  Object.entries(gapSystem).forEach(([key, value]) => {
    if (nonGapProps.includes(key)) return;

    const resolvedValue = resolveGapValue(value as number | "min");
    cssVars.push(
      generateCssVar({
        prefix: prefixes.gap,
        tokenName: key,
        value: `${resolvedValue}${unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  });

  return cssVars;
}

// TYPOGRAPHY ------------------------------------------- //
function generateTypographyVarsForMode(
  mode: TypographyMode & { name: string },
): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];
  const typographySystem = mode.tokens;

  // Generate min font size token
  cssVars.push(
    generateCssVar({
      prefix: prefixes.typography,
      tokenName: "min",
      value: `${typographySystem.min}${typographySystem.unit}`,
      separators,
      varPrefix: prefixes.var,
    }),
  );

  // Generate font sizes
  for (let i = 1; i <= typographySystem.range; i++) {
    const fontSize =
      i === 1
        ? typographySystem.base
        : typographySystem.base + typographySystem.increment * (i - 1);

    const formattedSize = fontSize.toFixed(4).replace(/\.?0+$/, "");

    cssVars.push(
      generateCssVar({
        prefix: prefixes.typography,
        tokenName: i.toString(),
        value: `${formattedSize}${typographySystem.unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  }

  return cssVars;
}

// BORDER: Radius --------------------------------------- //
function generateBorderRadiusVarsForMode(
  borderRadiusMode: BorderRadiusMode & { name: string },
  spacingMode: SpacingMode & { name: string },
): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];
  const borderRadiusSystem = borderRadiusMode.tokens;
  const spacingSystem = spacingMode.tokens;

  // Determine unit (use border radius unit if specified, otherwise spacing unit)
  const unit = borderRadiusSystem.unit || spacingSystem.unit;

  // Helper function to resolve a border radius value
  const resolveBorderRadiusValue = (value: number | "min") => {
    if (value === "min") return spacingSystem.min;
    return value * spacingSystem.base;
  };

  // Dynamically process all properties in the border radius config
  const nonBorderRadiusProps = ["unit", "spacingMode"];

  Object.entries(borderRadiusSystem).forEach(([key, value]) => {
    if (nonBorderRadiusProps.includes(key)) return;

    const resolvedValue = resolveBorderRadiusValue(value as number | "min");
    cssVars.push(
      generateCssVar({
        prefix: prefixes.borderRadius,
        tokenName: key,
        value: `${resolvedValue}${unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  });

  return cssVars;
}

// BORDER: Width ---------------------------------------- //
function generateBorderWidthVarsForMode(
  mode: BorderWidthMode & { name: string },
): string[] {
  const { prefixes } = transformerConfig.css;
  const cssVars: string[] = [];
  const borderWidthSystem = mode.tokens;

  // Generate border width variable (no tokenName for border width)
  cssVars.push(
    `  --${prefixes.borderWidth}: ${borderWidthSystem.value}${borderWidthSystem.unit};`,
  );

  return cssVars;
}

// TIME ------------------------------------------------- //
function generateTimeVarsForMode(mode: TimeMode & { name: string }): string[] {
  const { prefixes, separators } = transformerConfig.css;
  const cssVars: string[] = [];
  const timeSystem = mode.tokens;

  // Process standard time
  const standardSystem = timeSystem.standard;

  // Generate the minimum standard time variable
  cssVars.push(
    generateCssVar({
      prefix: prefixes.time,
      tokenName: "min",
      value: `${standardSystem.min}${standardSystem.unit}`,
      separators,
      varPrefix: prefixes.var,
    }),
  );

  // Generate standard time range variables
  for (let i = 1; i <= standardSystem.range; i++) {
    cssVars.push(
      generateCssVar({
        prefix: prefixes.time,
        tokenName: i.toString(),
        value: `${standardSystem.base * i}${standardSystem.unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  }

  // Process animation time
  const animationSystem = timeSystem.animation;

  // Generate the minimum animation time variable
  cssVars.push(
    generateCssVar({
      prefix: prefixes.time,
      tokenName: "anim-min",
      value: `${animationSystem.min}${animationSystem.unit}`,
      separators,
      varPrefix: prefixes.var,
    }),
  );

  // Generate animation time range variables
  for (let i = 1; i <= animationSystem.range; i++) {
    cssVars.push(
      generateCssVar({
        prefix: prefixes.time,
        tokenName: `anim-${i}`,
        value: `${animationSystem.base * i}${animationSystem.unit}`,
        separators,
        varPrefix: prefixes.var,
      }),
    );
  }

  // Process shorthands
  if (timeSystem.shorthands) {
    Object.entries(timeSystem.shorthands).forEach(
      ([shorthandName, timeValue]) => {
        const varReference = `--${prefixes.time}-${timeValue}`;
        cssVars.push(
          `  --${prefixes.time}-${shorthandName}: var(${varReference});`,
        );
      },
    );
  }

  return cssVars;
}

// OUTPUT ----------------------------------------------- //
export function generateCssVariables(designSystem: DesignSystem): string {
  const { selectors } = transformerConfig.css;
  const blocks: string[] = [];

  // Step 1: Generate :root block with all default mode tokens
  const rootVars: string[] = [];

  // Get default modes for each token family
  const { defaultMode: defaultColorMode } = separateDefaultAndOverrides(
    designSystem.colors.modes,
  );
  const { defaultMode: defaultSpacingMode } = separateDefaultAndOverrides(
    designSystem.spacing.modes,
  );
  const { defaultMode: defaultGapMode } = separateDefaultAndOverrides(
    designSystem.gap.modes,
  );
  const { defaultMode: defaultTypographyMode } = separateDefaultAndOverrides(
    designSystem.typography.modes,
  );
  const { defaultMode: defaultBorderRadiusMode } = separateDefaultAndOverrides(
    designSystem.border.radius.modes,
  );
  const { defaultMode: defaultBorderWidthMode } = separateDefaultAndOverrides(
    designSystem.border.width.modes,
  );
  const { defaultMode: defaultTimeMode } = separateDefaultAndOverrides(
    designSystem.time.modes,
  );

  // Generate default mode tokens for :root
  const normalizedColors = normalizeColorModes(designSystem.colors);
  const defaultTransparencySchedule =
    defaultColorMode.transparencySchedule ||
    normalizedColors.transparencySchedule;

  rootVars.push(
    ...generateColorVarsForMode(defaultColorMode, defaultTransparencySchedule),
  );
  rootVars.push(...generateSpacingVarsForMode(defaultSpacingMode));
  rootVars.push(...generateGapVarsForMode(defaultGapMode, defaultSpacingMode));
  rootVars.push(...generateTypographyVarsForMode(defaultTypographyMode));
  rootVars.push(
    ...generateBorderRadiusVarsForMode(
      defaultBorderRadiusMode,
      defaultSpacingMode,
    ),
  );
  rootVars.push(...generateBorderWidthVarsForMode(defaultBorderWidthMode));
  rootVars.push(...generateTimeVarsForMode(defaultTimeMode));

  // Add :root block using config selector
  blocks.push(`${selectors.root} {\n${rootVars.join("\n")}\n}`);

  // Step 2: Generate theme override blocks
  const overridesByMode = collectOverridesByModeName(designSystem);

  Object.entries(overridesByMode).forEach(([modeName, modeOverrides]) => {
    const themeVars: string[] = [];

    // Generate color overrides
    if (modeOverrides.colors) {
      const normalizedModeColors = normalizeColorModes({
        modes: [defaultColorMode, modeOverrides.colors],
        transparencySchedule: normalizedColors.transparencySchedule,
      });
      const modeTransparencySchedule =
        modeOverrides.colors.transparencySchedule ||
        normalizedModeColors.transparencySchedule;

      themeVars.push(
        ...generateColorVarsForMode(
          modeOverrides.colors,
          modeTransparencySchedule,
        ),
      );
    }

    // Generate spacing overrides
    if (modeOverrides.spacing) {
      themeVars.push(...generateSpacingVarsForMode(modeOverrides.spacing));
    }

    // Generate gap overrides
    if (modeOverrides.gap) {
      const spacingModeForGap = modeOverrides.spacing || defaultSpacingMode;
      themeVars.push(
        ...generateGapVarsForMode(modeOverrides.gap, spacingModeForGap),
      );
    }

    // Generate typography overrides
    if (modeOverrides.typography) {
      themeVars.push(
        ...generateTypographyVarsForMode(modeOverrides.typography),
      );
    }

    // Generate border radius overrides
    if (modeOverrides.borderRadius) {
      const spacingModeForBorder = modeOverrides.spacing || defaultSpacingMode;
      themeVars.push(
        ...generateBorderRadiusVarsForMode(
          modeOverrides.borderRadius,
          spacingModeForBorder,
        ),
      );
    }

    // Generate border width overrides
    if (modeOverrides.borderWidth) {
      themeVars.push(
        ...generateBorderWidthVarsForMode(modeOverrides.borderWidth),
      );
    }

    // Generate time overrides
    if (modeOverrides.time) {
      themeVars.push(...generateTimeVarsForMode(modeOverrides.time));
    }

    // Only add theme block if there are actual overrides
    if (themeVars.length > 0) {
      // Use config selector and replace {mode} placeholder
      const themeSelector = selectors.themeMode.replace("{mode}", modeName);
      blocks.push(`${themeSelector} {\n${themeVars.join("\n")}\n}`);
    }
  });

  return blocks.join("\n\n");
}
