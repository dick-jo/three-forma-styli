import { DesignSystem } from "@three-forma-styli/core";
import { color } from "./color";
import { spacing } from "./spacing";
import { gap } from "./gap";
import { typography } from "./typography";
import { border } from "./border";
import { time } from "./time";

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
