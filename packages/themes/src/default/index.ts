import { DesignSystem } from "@three-forma-styli/core";
import { color } from "./color.js";
import { spacing } from "./spacing.js";
import { gap } from "./gap.js";
import { typography } from "./typography.js";
import { border } from "./border.js";
import { time } from "./time.js";

// Default starter theme - a complete, ready-to-use design system
export const designSystem: DesignSystem = {
  colors: color,
  spacing,
  gap,
  typography,
  border,
  time,
};

// Also export as default for convenience
export default designSystem;

// Also export individual parts for customization
export { color, spacing, gap, typography, border, time };
