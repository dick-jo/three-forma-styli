# @three-forma-styli/cli

CLI tool for generating CSS design tokens from TypeScript definitions.

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

Generate CSS from theme files:

```bash
tfs build . --output tokens.css
```

Options:
- `--output, -o <path>` - Output file path (prints to stdout if omitted)

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

See the [main repo](https://github.com/three/three-forma-styli) for full documentation.
