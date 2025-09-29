import { transformerConfig } from "./config";
import fs from "fs-extra";
import path from "path";
import { DesignSystem } from "../types";

export function getDefaultMode<T extends { isDefault?: boolean; name: string }>(
  modes: T[],
): T {
  const defaultModes = modes.filter((mode) => mode.isDefault);

  if (defaultModes.length === 1) {
    return defaultModes[0];
  } else if (defaultModes.length > 1) {
    console.warn(
      `Multiple default modes found: ${defaultModes.map((m) => m.name).join(", ")}. Using '${defaultModes[0].name}' as default.`,
    );
    return defaultModes[0];
  } else {
    return modes[0];
  }
}

export function normalizeTokenModes<
  T extends { tokens: Record<string, any>; isDefault?: boolean },
>(modes: Array<T & { name: string }>): Array<T & { name: string }> {
  // Create a deep copy
  const normalizedModes = JSON.parse(JSON.stringify(modes)) as Array<
    T & { name: string }
  >;

  // Find the default mode
  const defaultMode = getDefaultMode(normalizedModes);

  // Now TypeScript knows defaultMode is of type T & { name: string }
  const defaultTokens = defaultMode.tokens;

  // For each non-default mode, add missing tokens from default
  normalizedModes.forEach((mode) => {
    if (mode === defaultMode) return;

    // Find tokens in default that are missing in this mode
    Object.entries(defaultTokens).forEach(([tokenName, tokenValue]) => {
      if (!mode.tokens[tokenName]) {
        mode.tokens[tokenName] = tokenValue;
      }
    });
  });

  return normalizedModes;
}

export function normalizeColorModes(
  colors: DesignSystem["colors"],
): DesignSystem["colors"] {
  // Create a deep copy
  const normalizedColors = JSON.parse(
    JSON.stringify(colors),
  ) as DesignSystem["colors"];

  // Normalize the modes
  normalizedColors.modes = normalizeTokenModes(normalizedColors.modes);

  // Handle transparency schedules
  const defaultMode = getDefaultMode(normalizedColors.modes);
  const defaultTransparencySchedule =
    defaultMode.transparencySchedule || normalizedColors.transparencySchedule;

  // For each mode, add missing transparency schedule
  normalizedColors.modes.forEach((mode) => {
    if (mode === defaultMode) return;

    // If mode doesn't have a transparency schedule, copy from default
    if (!mode.transparencySchedule) {
      mode.transparencySchedule = defaultTransparencySchedule;
    }
  });

  return normalizedColors;
}

export function generateCssVar(options: {
  prefix: string;
  tokenName: string;
  value: string;
  modifier?: string;
  valueIndicator?: string;
  separators: typeof transformerConfig.css.separators;
  varPrefix: string;
}): string {
  const {
    prefix,
    tokenName,
    value,
    modifier,
    valueIndicator,
    separators,
    varPrefix,
  } = options;

  // In the new model, we always generate unprefixed variable names
  // CSS selectors (:root vs [data-theme-mode]) are handled at block level
  const parts = [varPrefix, prefix, separators.value + tokenName];

  // Add modifier if present (e.g., "tr" for transparency)
  if (modifier) {
    parts.push(separators.modifier + modifier);
  }

  // Add value indicator if present (e.g., "min", "light-x")
  if (valueIndicator) {
    parts.push(separators.value + valueIndicator);
  }

  // Join to create the variable name
  const varName = parts.join("");

  // Return the complete CSS declaration
  return `  ${varName}: ${value};`;
}

export async function writeFile(
  content: string,
  outputDir: string,
  fileName: string,
): Promise<void> {
  await fs.ensureDir(outputDir);
  await fs.writeFile(path.join(outputDir, fileName), content);
}

export async function writeJsonFile(
  content: any,
  outputDir: string,
  fileName: string,
): Promise<void> {
  await fs.ensureDir(outputDir);
  await fs.writeJson(path.join(outputDir, fileName), content, {
    spaces: transformerConfig.json.spaces,
  });
}

export function separateDefaultAndOverrides<
  T extends { isDefault?: boolean; name: string },
>(modes: T[]): { defaultMode: T; overrideModes: T[] } {
  const defaultMode = getDefaultMode(modes);
  const overrideModes = modes.filter((mode) => mode !== defaultMode);
  return { defaultMode, overrideModes };
}
