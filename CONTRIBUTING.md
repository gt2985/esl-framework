# Contributing to ESL Framework

Thank you for your interest in contributing to the ESL Framework! This guide will help you get started with contributing to this open-source project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please treat all contributors and users with respect and create a welcoming environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- TypeScript 5.0+
- Git
- npm (comes with Node.js)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/esl-framework.git
   cd esl-framework
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Run the CLI locally:**
   ```bash
   npm link
   esl --help
   ```

## Making Changes

### Branch Naming

Create a descriptive branch name:
- `feature/add-new-command` - for new features
- `fix/resolve-sync-bug` - for bug fixes
- `docs/update-api-reference` - for documentation changes
- `refactor/improve-context-manager` - for refactoring

### Development Workflow

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
node test-context-management.js
node test-bidirectional-sync.js
node test-integration.js

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Add unit tests for new functions/classes
- Add integration tests for new CLI commands
- Test edge cases and error handling
- Ensure tests are deterministic and isolated

### Test Structure

```typescript
// Example test structure
describe('ContextManager', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should create optimized context', async () => {
    // Test implementation
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request:**
   - Use a clear, descriptive title
   - Provide a detailed description of changes
   - Link to relevant issues
   - Include screenshots if applicable

3. **PR Description Template:**
   ```markdown
   ## Summary
   Brief description of the change

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tests pass locally
   - [ ] Added new tests
   - [ ] Updated existing tests

   ## Documentation
   - [ ] Updated README
   - [ ] Updated API docs
   - [ ] Added inline comments
   ```

### Review Process

- All submissions require review from maintainers
- Address feedback promptly
- Be open to suggestions and improvements
- Tests must pass before merging

## Code Style Guidelines

### TypeScript Style

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Formatting

```typescript
// Good
export interface ESLDocument {
  metadata: DocumentMetadata;
  businessRules: BusinessRule[];
  dataStructures: DataStructure[];
}

// Bad
export interface ESLDocument{
  metadata:DocumentMetadata;
  businessRules:BusinessRule[];
  dataStructures:DataStructure[];
}
```

### Error Handling

- Use proper error types
- Provide meaningful error messages
- Handle edge cases gracefully

```typescript
// Good
try {
  const result = await processDocument(document);
  return result;
} catch (error) {
  if (error instanceof ESLError) {
    throw new ESLError(`Failed to process document: ${error.message}`, error.code);
  }
  throw error;
}
```

### CLI Commands

- Use Commander.js patterns
- Provide helpful help text
- Include examples in help
- Handle errors gracefully

```typescript
// Good
program
  .command('diff')
  .description('Compare ESL specification with codebase')
  .argument('<spec-file>', 'Path to ESL specification file')
  .argument('<code-dir>', 'Path to code directory')
  .option('-i, --interactive', 'Interactive mode')
  .example('esl diff spec.esl.yaml ./src')
  .action(async (specFile, codeDir, options) => {
    // Implementation
  });
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include parameter descriptions and return types
- Provide usage examples

```typescript
/**
 * Creates an optimized context from an ESL document
 * @param document - The ESL document to optimize
 * @param options - Configuration options
 * @returns Promise resolving to optimized context
 * @example
 * ```typescript
 * const context = await contextManager.createContext(document, {
 *   maxTokens: 8000,
 *   compressionLevel: 'medium'
 * });
 * ```
 */
async createContext(document: ESLDocument, options?: ContextOptions): Promise<ProcessingContext> {
  // Implementation
}
```

### User Documentation

- Update relevant documentation files
- Add examples for new features
- Keep documentation in sync with code changes

## Issue Reporting

### Bug Reports

Use the bug report template and include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment information
- Minimal reproduction example

### Feature Requests

Use the feature request template and include:
- Clear description of the feature
- Use cases and benefits
- Proposed implementation approach
- Examples of similar features

### Questions

- Check existing documentation first
- Search existing issues and discussions
- Provide context about what you're trying to achieve

## Development Tips

### Debugging

```bash
# Enable debug logging
DEBUG=esl:* esl command

# Run with verbose output
esl command --verbose

# Use Node.js debugging
node --inspect-brk dist/cli/index.js command
```

### Local Testing

```bash
# Test CLI without installing globally
node dist/cli/index.js --help

# Test specific commands
node dist/cli/index.js diff test-spec.esl.yaml ./src
```

### Performance Testing

```bash
# Run performance tests
npm run test:performance

# Profile memory usage
node --prof dist/cli/index.js command
```

## Release Process

Releases are handled by maintainers:

1. Version bump in package.json
2. Update CHANGELOG.md
3. Create GitHub release
4. Publish to npm

## Getting Help

- Check the [documentation](docs/)
- Search existing [issues](https://github.com/your-org/esl-framework/issues)
- Start a [discussion](https://github.com/your-org/esl-framework/discussions)
- Join our community chat

## Recognition

Contributors are recognized in:
- CHANGELOG.md for each release
- README.md contributors section
- GitHub contributors graph

Thank you for contributing to the ESL Framework! 🎉