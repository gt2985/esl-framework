# Simple CRM System

## Overview
A basic customer relationship management system built with ESL specifications.

## Getting Started

### Validate the specification
```bash
esl validate simple-crm.esl.yaml --strict
```

### Generate TypeScript code
```bash
esl generate typescript simple-crm.esl.yaml -o ./src
```

### Generate documentation
```bash
esl generate documentation simple-crm.esl.yaml -o ./docs
```

## Project Structure
- `simple-crm.esl.yaml` - Main ESL specification
- `src/` - Generated TypeScript code
- `docs/` - Generated documentation
- `tests/` - Test files

## Development
1. Modify the ESL specification as needed
2. Regenerate code using ESL CLI
3. Run tests to verify functionality
