# CLI Commands Reference

This document provides a complete reference for all ESL Framework CLI commands.

## Table of Contents

- [Global Options](#global-options)
- [init](#init) - Initialize a new ESL project
- [validate](#validate) - Validate ESL specifications
- [generate](#generate) - Generate code from specifications
- [diff](#diff) - Compare specification with code
- [sync](#sync) - Synchronize code with specification
- [context](#context) - Manage AI context
- [import](#import) - Import from external sources
- [interactive](#interactive) - Interactive specification builder
- [visualize](#visualize) - Generate diagrams
- [reverse](#reverse) - Generate specification from source code

## Global Options

All commands support these global options:

```bash
-v, --verbose       # Enable verbose output
--no-color         # Disable colored output
-h, --help         # Display help for command
--version          # Output the current version
```

## init

Initialize a new ESL project with templates and scaffolding.

### Usage

```bash
esl init <project-type> [options]
```

### Arguments

- `<project-type>` - Type of project to create:
  - `simple-crm` - Basic CRM system
  - `api-service` - RESTful API service
  - `enterprise-system` - Complex multi-service system
  - `custom` - Custom project setup

### Options

- `-t, --template <template>` - Project template (default: "basic")
- `-d, --directory <directory>` - Target directory (default: ".")
- `--no-git` - Skip git repository initialization

### Examples

```bash
# Create a simple CRM project
esl init simple-crm --template basic

# Create an API service in a specific directory
esl init api-service --directory ./my-api --template modern

# Create without git initialization
esl init enterprise-system --no-git
```

## validate

Validate ESL specifications against schema and business rules.

### Usage

```bash
esl validate [file-pattern] [options]
```

### Arguments

- `[file-pattern]` - File pattern to validate (default: "*.esl.yaml")

### Options

- `-s, --strict` - Enable strict validation mode
- `-f, --format <format>` - Output format: "human" or "json" (default: "human")
- `--no-semantic` - Skip semantic analysis

### Examples

```bash
# Validate all ESL files
esl validate

# Validate specific file with strict mode
esl validate my-spec.esl.yaml --strict

# Get JSON output for CI/CD
esl validate specs/**/*.esl.yaml --format json
```

## generate

Generate code, documentation, and artifacts from ESL specifications.

### Usage

```bash
esl generate <target> [options]
```

### Arguments

- `<target>` - Generation target:
  - `typescript` - TypeScript interfaces and services
  - `openapi` - OpenAPI specification
  - `documentation` - HTML documentation
  - `tests` - Test stubs and boilerplate

### Options

- `-o, --output <directory>` - Output directory (default: "./generated")
- `-c, --context <context>` - Context file for AI optimization
- `-t, --template <template>` - Custom template directory
- `--no-metadata` - Exclude governance metadata

### Examples

```bash
# Generate TypeScript code
esl generate typescript my-spec.esl.yaml -o ./src

# Generate OpenAPI specification
esl generate openapi my-spec.esl.yaml -o ./docs/api

# Generate with custom template
esl generate typescript my-spec.esl.yaml -t ./custom-templates
```

## diff

Compare ESL specification with codebase to detect drift.

### Usage

```bash
esl diff <spec-file> <code-directory> [options]
```

### Arguments

- `<spec-file>` - Path to ESL specification file
- `<code-directory>` - Path to code directory

### Options

- `-i, --interactive` - Interactively fix drift issues
- `-a, --apply` - Automatically apply all fixable drift fixes

### Examples

```bash
# Basic drift detection
esl diff my-spec.esl.yaml ./src

# Interactive drift resolution
esl diff my-spec.esl.yaml ./src --interactive

# Automatic fixes
esl diff my-spec.esl.yaml ./src --apply
```

### Exit Codes

- `0` - No drift detected
- `1` - Drift detected
- `2` - Error occurred

## sync

Synchronize code with ESL specification (spec as source of truth).

### Usage

```bash
esl sync <spec-file> <code-directory> [options]
```

### Arguments

- `<spec-file>` - Path to ESL specification file
- `<code-directory>` - Path to code directory

### Options

- `-f, --force` - Apply changes without confirmation
- `-d, --dry-run` - Show what would be changed without applying
- `-b, --backup` - Create backups of modified files
- `-v, --verbose` - Show detailed progress

### Examples

```bash
# Dry run to see changes
esl sync my-spec.esl.yaml ./src --dry-run

# Apply changes with backup
esl sync my-spec.esl.yaml ./src --backup

# Force apply without confirmation
esl sync my-spec.esl.yaml ./src --force
```

### Safety Features

- **Dry Run**: Preview changes before applying
- **Backup**: Automatic backup of modified files
- **Confirmation**: User confirmation for destructive changes
- **Risk Assessment**: Color-coded risk levels for changes

## context

Manage AI context for ESL specifications.

### Usage

```bash
esl context <action> <spec-file> [options]
```

### Arguments

- `<action>` - Context action:
  - `create` - Create optimized context
  - `chunk` - Split into manageable chunks
  - `optimize` - Optimize for specific model
  - `analyze` - Analyze context quality
  - `stream` - Stream large documents

- `<spec-file>` - ESL specification file

### Options

- `-o, --output <file>` - Output file for results
- `-m, --model <model>` - Target AI model: "gpt-4", "claude-3", "gemini-pro" (default: "gpt-4")
- `-t, --tokens <number>` - Maximum token count (default: "4000")
- `-c, --compression <level>` - Compression level: "low", "medium", "high" (default: "medium")
- `-s, --strategy <strategy>` - Chunking strategy: "semantic", "adaptive", "business_rules"
- `-f, --format <format>` - Output format: "json", "yaml", "text" (default: "json")
- `--stream` - Enable streaming mode for large documents
- `--analyze` - Include detailed analysis in output

### Examples

```bash
# Create optimized context for GPT-4
esl context create my-spec.esl.yaml --model gpt-4 --tokens 8000

# Chunk large specification
esl context chunk my-spec.esl.yaml --tokens 2000 --format yaml

# Optimize for Claude-3 with high compression
esl context optimize my-spec.esl.yaml --model claude-3 --compression high

# Stream large document
esl context stream my-spec.esl.yaml --chunk-size 1500 --overlap 200
```

## import

Import specifications from external tools and formats.

### Usage

```bash
esl import <source> <input> [options]
```

### Arguments

- `<source>` - Import source:
  - `openapi` - OpenAPI specification
  - `jira` - JIRA project export
  - `github` - GitHub repository analysis

- `<input>` - Input file or configuration

### Options

- `-e, --enhance` - Enhance with AI context and business rules
- `-o, --output <file>` - Output ESL file
- `--format <format>` - Force input format detection

### Examples

```bash
# Import OpenAPI specification
esl import openapi swagger.yaml --output my-spec.esl.yaml

# Import with AI enhancement
esl import openapi swagger.yaml --enhance --output enhanced-spec.esl.yaml

# Import from JIRA
esl import jira project-export.json --output jira-spec.esl.yaml
```

## interactive

Launch the interactive specification builder.

### Usage

```bash
esl interactive [options]
```

### Options

None specific to this command. Uses global options.

### Features

- **Guided Setup**: Step-by-step specification creation
- **Template Selection**: Choose from pre-built templates
- **Real-time Validation**: Immediate feedback on specification
- **Export Options**: Save as ESL, generate code, or export to other formats

### Example

```bash
# Launch interactive builder
esl interactive
```

## visualize

Generate diagrams from ESL specifications.

### Usage

```bash
esl visualize <file> [options]
```

### Arguments

- `<file>` - ESL file to visualize

### Options

- `-o, --output <file>` - Output file name without extension (default: "diagram")

### Examples

```bash
# Generate diagram
esl visualize my-spec.esl.yaml

# Custom output name
esl visualize my-spec.esl.yaml --output my-diagram
```

### Output Formats

- **Mermaid**: `.mmd` file for Mermaid diagrams
- **SVG**: `.svg` file for scalable vector graphics
- **PNG**: `.png` file for raster images (requires mermaid-cli)

## reverse

Generate ESL specification from existing source code (reverse engineering).

### Usage

```bash
esl reverse <source> [options]
```

### Arguments

- `<source>` - Source path (GitHub repository URL or local directory)

### Options

- `-o, --output <file>` - Output ESL file (default: "reverse-engineered.esl.yaml")
- `-l, --language <lang>` - Source language: "typescript", "javascript", "python" (default: "typescript")
- `-p, --patterns <patterns>` - File patterns to analyze (default: "**/*.ts,**/*.js")
- `--include-comments` - Include code comments as descriptions
- `--infer-relationships` - Infer relationships between models (default: true)
- `--detect-apis` - Detect API endpoints from routing code (default: true)
- `--dry-run` - Show what would be generated without creating files
- `--verbose` - Verbose output

### Examples

```bash
# Generate spec from GitHub repository
esl reverse https://github.com/user/my-app --output my-app.esl.yaml

# Generate spec from local TypeScript project
esl reverse ./src --language typescript --include-comments

# Generate spec with custom patterns
esl reverse ./backend --patterns "**/*.service.ts,**/*.model.ts"

# Dry run to preview generated specification
esl reverse ./my-project --dry-run --verbose

# Generate from JavaScript project
esl reverse ./js-app --language javascript --output js-app.esl.yaml
```

### Supported Features

#### TypeScript/JavaScript Analysis
- **Interfaces**: Converted to ESL data models
- **Classes**: Analyzed for services (if ending in Service/Controller) or data models
- **Enums**: Converted to ESL enum types
- **Method Signatures**: Extracted for service definitions
- **Comments**: Included as descriptions when `--include-comments` is used
- **Type Relationships**: Automatically inferred between models

#### Model Inference
- **Property Types**: Automatically mapped to ESL types
- **Required/Optional**: Detected from TypeScript optional properties
- **Relationships**: Inferred from property types that reference other models
- **Collections**: Array types automatically detected as `has_many` relationships

#### Service Detection
- **Service Classes**: Classes ending in "Service" or "Controller"
- **Method Parameters**: Extracted with types
- **Return Types**: Automatically detected
- **Async Methods**: Properly handled

### Generated Specification Structure

```yaml
eslVersion: "1.0.0"
project:
  name: "My Project"
  version: "1.0.0"
  description: "Auto-generated from source code"
  repository: "https://github.com/user/my-project"

metadata:
  generated: "2024-01-15T10:30:00Z"
  source: "/path/to/source"
  author: "ESL Framework Reverse Engineering"

dataModels:
  User:
    type: "interface"
    properties:
      id:
        type: "string"
        required: true
      name:
        type: "string"
        required: true
      email:
        type: "string"
        required: true
    relationships:
      - type: "has_many"
        target: "Order"
        property: "orders"

services:
  UserService:
    methods:
      createUser:
        parameters:
          - name: "userData"
            type: "User"
        returns: "User"
        description: "Creates a new user"
```

### Validation

The reverse command automatically validates the generated specification and provides warnings for:
- Empty models (models without properties)
- Empty services (services without methods)
- Missing descriptions
- Potential relationship issues

### Integration with Other Commands

After generating a specification, you can immediately use other ESL commands:

```bash
# Generate specification from code
esl reverse ./src --output my-spec.esl.yaml

# Validate the generated specification
esl validate my-spec.esl.yaml --strict

# Check for drift (should show no drift initially)
esl diff my-spec.esl.yaml ./src

# Generate fresh code from specification
esl generate typescript my-spec.esl.yaml -o ./generated
```

## Environment Variables

Configure ESL behavior with environment variables:

```bash
# Enable verbose logging
export ESL_VERBOSE=true

# Set default AI model
export ESL_DEFAULT_MODEL=gpt-4

# Set default token limit
export ESL_DEFAULT_TOKENS=8000

# Disable color output
export NO_COLOR=1
```

## Configuration Files

### `esl.config.js`

```javascript
module.exports = {
  // Default options for commands
  defaults: {
    model: 'gpt-4',
    tokens: 4000,
    compression: 'medium'
  },
  
  // Custom templates
  templates: {
    typescript: './custom-templates/typescript',
    documentation: './custom-templates/docs'
  },
  
  // Validation rules
  validation: {
    strict: true,
    semantic: true,
    governance: true
  }
};
```

### `.eslrc.yaml`

```yaml
# Project-specific configuration
defaults:
  model: claude-3
  tokens: 8000
  compression: high

templates:
  typescript: ./templates/ts
  
validation:
  strict: true
```

## Error Handling

### Common Exit Codes

- `0` - Success
- `1` - Validation failure or drift detected
- `2` - Command error or invalid arguments
- `3` - File system error
- `4` - Network error (for imports)

### Error Messages

All error messages follow a consistent format:

```
Error: [ERROR_CODE] Description of the error
  at command (file:line:column)
  
Suggestion: How to fix the error
```

### Debug Mode

Enable debug mode for detailed error information:

```bash
esl command --verbose
# or
DEBUG=esl:* esl command
```

## Best Practices

### 1. Use Strict Mode

Always use `--strict` flag for validation in CI/CD:

```bash
esl validate specs/**/*.esl.yaml --strict
```

### 2. Regular Drift Checks

Include drift detection in your development workflow:

```bash
# In package.json scripts
"scripts": {
  "check-drift": "esl diff specs/api.esl.yaml ./src",
  "fix-drift": "esl diff specs/api.esl.yaml ./src --interactive"
}
```

### 3. Backup Before Sync

Always use backup when syncing:

```bash
esl sync specs/api.esl.yaml ./src --backup --dry-run
```

### 4. Context Optimization

Optimize context for your specific AI model:

```bash
esl context create specs/large-spec.esl.yaml --model claude-3 --tokens 100000
```

### 5. CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: ESL Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      - run: esl validate specs/**/*.esl.yaml --strict --format json
      - run: esl diff specs/api.esl.yaml ./src
```

## Troubleshooting

### Common Issues

1. **Command not found**: Ensure global installation `npm install -g esl-framework`
2. **Permission errors**: Use `sudo` for global install or configure npm prefix
3. **Version conflicts**: Check Node.js version (requires 18+)
4. **Memory issues**: Use streaming for large files `esl context stream`

### Getting Help

- Use `--help` flag with any command
- Check verbose output with `--verbose`
- Visit [GitHub Issues](https://github.com/your-org/esl-framework/issues)
- Read the [API Documentation](api-reference.md)

---

*This documentation is generated for ESL Framework. For the latest updates, visit the [GitHub repository](https://github.com/your-org/esl-framework).*