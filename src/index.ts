// src/index.ts
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { Command } from "commander";
import { designSystem } from "./systems";
import { generateCssVariables, generateFigmaTokens } from "./transformers";

// Welcome message
console.log(chalk.magenta.bold("Three-Forma-Styli: Design Token Generator"));
console.log(chalk.magenta("-----------------------------------"));

// Main function
async function main(): Promise<void> {
  try {
    // Setup command line options
    const program = new Command();
    program
      .version("1.0.0")
      .description("Design token generator for CSS variables")
      .option("-o, --output <path>", "output directory", "dist")
      .option("-j, --json", "also generate JSON config file")
      .option("-f, --figma", "generate Figma-compatible token files") // Add this line
      .parse(process.argv);

    const options = program.opts();
    const outputDir = path.resolve(options.output);

    // Log the configuration
    console.log(chalk.cyan("Using design system configuration from config.ts"));

    // Generate CSS variables
    const cssContent = generateCssVariables(designSystem);

    // Write to output directory
    const outputPath = path.join(outputDir, "tokens.css");
    await fs.ensureDir(outputDir);
    await fs.writeFile(outputPath, cssContent);
    console.log(chalk.green(`✓ Generated ${outputPath}`));

    // Optionally generate JSON file
    if (options.json) {
      const jsonPath = path.join(outputDir, "tokens.json");
      await fs.writeJson(jsonPath, designSystem, { spaces: 2 });
      console.log(chalk.green(`✓ Generated ${jsonPath}`));
    }

    // Optionally generate Figma-compatible tokens
    if (options.figma) {
      const figmaDir = path.join(outputDir, "figma");
      await generateFigmaTokens(designSystem, figmaDir);
      console.log(chalk.green(`✓ Generated Figma tokens in ${figmaDir}`));
      console.log(
        chalk.blue(
          "ℹ️ Import all JSON files in the figma directory into Design Tokens Manager plugin",
        ),
      );
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err);
  }
}

main();
