import { DesignSystem } from "../types";
import { colors } from "./colors";
import { spacing } from "./spacing";
import { gap } from "./gap";
import { typography } from "./typography";
import { border } from "./border";
import { time } from "./time";

// Combine all configurations into the design system
export const designSystem: DesignSystem = {
  colors,
  spacing,
  gap,
  typography,
  border,
  time,
};
