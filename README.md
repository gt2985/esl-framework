# ESL Framework

## Overview
The ESL Framework is a TypeScript-based CLI and library for working with Enterprise Specification Language (ESL) documents. It provides parsing, validation, code generation, and integration capabilities for ESL specifications.

## Installation
```bash
npm install -g esl-framework
```

## Usage
```bash
# Initialize new ESL project
esl init web_app --template modern

# Validate ESL specification
esl validate my-app.esl.yaml

# Generate code from specification
esl generate typescript --output ./src

# Import from other formats
esl import openapi swagger.yaml --enhance
```

## Development
```bash
# Install dependencies
npm install

# Build the framework
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Architecture
- **Core**: Types, parsing, and validation
- **CLI**: Command-line interface
- **Context**: AI context management
- **Generation**: Code generation engines
- **Integration**: External tool adapters
- **Governance**: Compliance and audit features

## Feature Roadmap
While the current framework provides core functionality, the following features are planned to enhance its power and developer experience:

- **IDE Extension (VS Code):**
    - [ ] Syntax highlighting for `.esl.yaml` files.
    - [ ] Real-time validation and error checking against the ESL schema.
    - [ ] Autocompletion for properties and values.

- **Specification Visualization:**
    - [ ] `esl visualize --type component` to generate a component diagram.
    - [ ] `esl visualize --type sequence` to generate a sequence diagram.

- **Reverse Engineering:**
    - [ ] `esl import --from-code ./src` to generate a draft ESL file from an existing codebase.

- **Advanced Test Generation:**
    - [ ] `esl generate --type tests` to create test stubs and boilerplate for all defined services and endpoints.

- **CI/CD Integration:**
    - [ ] A pre-built GitHub Action to run `esl validate` on pull requests.

- **Modularity and Imports:**
    - [ ] Support for an `imports:` key in ESL files to include and reference other ESL specifications.

## Self-Hosting
This framework is built using ESL itself. The bootstrap specification that defines ESL can be found in the esl-project repository.

## License
MIT
