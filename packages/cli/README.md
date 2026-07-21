# @three-forma-styli/cli

CLI tool for generating CSS, DTCG JSON, and Figma Variables from TypeScript definitions.

## Installation

```bash
npm install -g @three-forma-styli/cli
```

## Commands

### `tfs init`

Scaffold a new theme project with TypeScript files:

```bash
tfs init
```

Creates theme files (color.ts, spacing.ts, etc.), package.json, and tsconfig.json.

Options:
- `-t, --theme <name>` - Choose starter theme (default: "default")
- `--skip-install` - Skip automatic dependency installation

### `tfs build`

Generate output from theme files:

```bash
tfs build . --output tokens.css
```

Options:
- `--output, -o <path>` - Output file path (prints to stdout if omitted)
- `--format, -f <format>` - `css`, `dtcg`, or `figma-variables`
- `--collection <name>` - Figma collection name
- `--color-space <space>` - `srgb` or `display-p3`; must match the Figma file profile

### `tfs figma-sync`

Create or update color variables through Figma's Variables REST API:

```bash
FIGMA_TOKEN=... tfs figma-sync . --file-key ... --color-space display-p3
tfs figma-sync . --file-key dry-run --dry-run
```

Live sync requires Figma Enterprise access and both `file_variables:read` and
`file_variables:write` token scopes. The command does not delete variables or
modes that are absent from the source.

## Example Workflow

```bash
# Create new project
mkdir my-theme && cd my-theme

# Initialize with starter files
tfs init

# Edit your theme files
# (full IntelliSense from @three-forma-styli/core)

# Generate CSS
tfs build . --output tokens.css
```

See the [main repo](https://github.com/dick-jo/three-forma-styli) for full documentation.
