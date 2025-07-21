# Getting Started with ESL Framework

Welcome to the ESL Framework! This guide will walk you through your first steps with the Enterprise Specification Language Framework, from installation to creating your first specification and generating code.

## Table of Contents

- [What is ESL Framework?](#what-is-esl-framework)
- [Installation](#installation)
- [Your First ESL Specification](#your-first-esl-specification)
- [Basic Commands](#basic-commands)
- [Understanding the Output](#understanding-the-output)
- [Next Steps](#next-steps)

## What is ESL Framework?

The ESL Framework solves the critical problem of **specification drift** - when business requirements documented in specifications become out of sync with the actual code implementation. It provides:

- **Bidirectional Synchronization**: Keep specs and code in perfect alignment
- **AI-Optimized Context**: Transform specifications for efficient AI processing
- **Multi-Platform Generation**: Generate code for TypeScript, OpenAPI, and more
- **Enterprise Governance**: Built-in validation and compliance features

## Installation

### Prerequisites

Before installing ESL Framework, ensure you have:
- Node.js 18.0.0 or higher
- TypeScript 5.0+ (for code generation)
- Git (for version control integration)

### Install ESL Framework

```bash
# Install globally via npm
npm install -g esl-framework

# Verify installation
esl --version

# Get help
esl --help
```

### Development Setup (Optional)

For contributing or advanced usage:

```bash
# Clone the repository
git clone https://github.com/gt2985/esl-framework.git
cd esl-framework

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

## Your First ESL Specification

Let's create your first ESL specification for a simple task management system.

### Step 1: Initialize a New Project

```bash
# Create a new directory
mkdir my-task-app
cd my-task-app

# Initialize ESL project
esl init simple-crm --template basic
```

This creates:
- `simple-crm.esl.yaml` - Main specification file
- `src/` - Directory for generated code
- `docs/` - Documentation output
- `tests/` - Test files

### Step 2: Understand the Basic Structure

Open `simple-crm.esl.yaml` and examine the structure:

```yaml
eslVersion: "1.0.0"
project:
  name: "Simple CRM"
  version: "1.0.0"
  description: "A basic CRM system"

metadata:
  author: "Your Name"
  created: "2024-01-15"
  
dataModels:
  User:
    properties:
      id: { type: string, required: true }
      name: { type: string, required: true }
      email: { type: string, required: true }
    
  Task:
    properties:
      id: { type: string, required: true }
      title: { type: string, required: true }
      description: { type: string }
      completed: { type: boolean, default: false }
      userId: { type: string, required: true }

services:
  UserService:
    methods:
      createUser:
        parameters:
          - name: userData
            type: User
        returns: User
      
      getUserById:
        parameters:
          - name: id
            type: string
        returns: User

apiEndpoints:
  - path: "/api/users"
    method: POST
    summary: "Create a new user"
    operationId: "createUser"
    requestBody:
      content: User
    responses:
      201:
        description: "User created successfully"
        content: User
```

### Step 3: Validate Your Specification

```bash
# Validate the specification
esl validate simple-crm.esl.yaml

# Use strict mode for production
esl validate simple-crm.esl.yaml --strict
```

Expected output:
```
✅ Validation successful
📊 Summary:
  - 2 data models validated
  - 1 service validated
  - 1 API endpoint validated
  - 0 errors, 0 warnings
```

## Basic Commands

### 1. Generate Code

```bash
# Generate TypeScript interfaces and services
esl generate typescript simple-crm.esl.yaml -o ./src

# Generate OpenAPI specification
esl generate openapi simple-crm.esl.yaml -o ./docs/api

# Generate documentation
esl generate documentation simple-crm.esl.yaml -o ./docs
```

### 2. Check for Drift

After generating code, you might modify it. Check for drift:

```bash
# Detect drift between spec and code
esl diff simple-crm.esl.yaml ./src

# Interactive drift resolution
esl diff simple-crm.esl.yaml ./src --interactive

# Auto-fix drift issues
esl diff simple-crm.esl.yaml ./src --apply
```

### 3. Synchronize Code

Keep your code in sync with the specification:

```bash
# Preview sync changes
esl sync simple-crm.esl.yaml ./src --dry-run

# Apply changes with backup
esl sync simple-crm.esl.yaml ./src --backup

# Force sync without confirmation
esl sync simple-crm.esl.yaml ./src --force
```

### 4. AI Context Management

Optimize your specification for AI processing:

```bash
# Create AI-optimized context
esl context create simple-crm.esl.yaml --model gpt-4 --tokens 8000

# Chunk large specifications
esl context chunk simple-crm.esl.yaml --tokens 2000

# Stream processing for very large specs
esl context stream simple-crm.esl.yaml --chunk-size 1500
```

## Understanding the Output

### Generated TypeScript Code

After running `esl generate typescript`, you'll see:

```typescript
// src/models/user.ts
export interface User {
  /** User ID */
  id: string;
  /** User name */
  name: string;
  /** User email */
  email: string;
}

// src/models/task.ts
export interface Task {
  /** Task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Task completion status */
  completed: boolean;
  /** User ID */
  userId: string;
}

// src/services/userservice.ts
export class UserService {
  async createUser(userData: User): Promise<User> {
    throw new Error('Method not implemented');
  }
  
  async getUserById(id: string): Promise<User> {
    throw new Error('Method not implemented');
  }
}
```

### Drift Detection Output

When you run `esl diff`, you might see:

```
🔍 ESL Drift Report:
Found 3 drift issues

📊 Model Drift:
❌ Property 'Task.priority' (string) found in code but not in spec
⚠️  Property 'User.createdAt' (Date) found in code but not in spec
🔄 Property 'User.email' type mismatch: expected string, got EmailAddress

🔧 Service Drift:
❌ Method 'UserService.deleteUser' found in code but not in spec

💡 Suggestions:
  - Add missing properties to specification
  - Update type definitions for consistency
  - Consider adding missing methods to spec
```

## Next Steps

### 1. Explore Advanced Features

```bash
# Create interactive specification
esl interactive

# Generate visual diagrams
esl visualize simple-crm.esl.yaml

# Import from external sources
esl import openapi swagger.yaml --output imported-spec.esl.yaml
```

### 2. Set Up CI/CD Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "validate-spec": "esl validate specs/**/*.esl.yaml --strict",
    "check-drift": "esl diff specs/api.esl.yaml ./src",
    "sync-code": "esl sync specs/api.esl.yaml ./src --dry-run"
  }
}
```

### 3. Learn More

- **[Advanced Usage](advanced-usage.md)** - Complex scenarios and best practices
- **[CLI Commands](cli-commands.md)** - Complete command reference
- **[Bidirectional Sync](bidirectional-sync.md)** - Deep dive into sync features
- **[Context Management](context-management.md)** - AI optimization techniques
- **[API Reference](api-reference.md)** - Programmatic usage

### 4. Join the Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Contributing**: Help improve the framework

## Common Issues and Solutions

### Issue: "Command not found: esl"

**Solution**: Ensure global installation:
```bash
npm install -g esl-framework
```

### Issue: "Validation failed"

**Solution**: Check your YAML syntax:
```bash
# Use a YAML validator
esl validate your-spec.esl.yaml --verbose
```

### Issue: "Generation failed"

**Solution**: Verify your specification structure:
```bash
# Check for missing required fields
esl validate your-spec.esl.yaml --strict
```

### Issue: "Drift detection not working"

**Solution**: Ensure proper file paths:
```bash
# Check if files exist
ls -la ./src
esl diff your-spec.esl.yaml ./src --verbose
```

## Quick Reference

### Essential Commands
```bash
# Initialize project
esl init <type> --template <template>

# Validate specification
esl validate <file> --strict

# Generate code
esl generate <target> <file> -o <output>

# Check drift
esl diff <spec> <code-dir>

# Sync code
esl sync <spec> <code-dir> --dry-run

# Create AI context
esl context create <file> --model <model>
```

### File Structure
```
my-project/
├── spec.esl.yaml          # Main specification
├── src/                   # Generated code
│   ├── models/           # Data models
│   ├── services/         # Business services
│   └── controllers/      # API controllers
├── docs/                 # Documentation
└── tests/                # Test files
```

---

**Congratulations!** You've successfully created your first ESL specification and learned the basic commands. The ESL Framework is now helping you maintain perfect synchronization between your business requirements and code implementation.

*For more advanced topics, continue to the [Advanced Usage Guide](advanced-usage.md).*