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

## Self-Hosting
This framework is built using ESL itself. The bootstrap specification that defines ESL can be found in the esl-project repository.

## License
MIT
