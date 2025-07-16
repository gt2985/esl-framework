import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface InitOptions {
  template: string;
  directory: string;
  git: boolean;
}

interface ProjectTemplate {
  name: string;
  description: string;
  files: Record<string, string>;
  directories: string[];
}

const PROJECT_TEMPLATES: Record<string, Record<string, ProjectTemplate>> = {
  'simple-crm': {
    basic: {
      name: 'Simple CRM - Basic',
      description: 'Basic CRM system with customers and leads',
      directories: ['src', 'docs', 'tests'],
      files: {
        'simple-crm.esl.yaml': `# Simple CRM ESL Specification
metadata:
  version: "1.0.0"
  id: "simple-crm"
  title: "Simple CRM System"
  description: "Customer relationship management system"
  author: "ESL Framework"
  created: "${new Date().toISOString()}"

businessRules:
  - id: "customer-validation"
    name: "Customer Validation"
    description: "Customers must have valid contact information"
    condition: "customer is created or updated"
    action: "validate email format and phone number"
    priority: 1
    enabled: true

dataStructures:
  - id: "customer"
    name: "Customer"
    type: "object"
    description: "Customer entity with contact information"
    fields:
      - name: "id"
        type: "string"
        required: true
        description: "Unique customer identifier"
      - name: "email"
        type: "string"
        required: true
        description: "Customer email address"
        validation:
          - type: "pattern"
            pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
            message: "Must be a valid email address"
      - name: "name"
        type: "string"
        required: true
        description: "Customer full name"
      - name: "company"
        type: "string"
        required: false
        description: "Customer company name"

aiContext:
  modelHints:
    - "@generation_target: typescript_react_app"
    - "@architectural_pattern: clean_architecture"
  constraints:
    - "Use TypeScript for type safety"
    - "Follow React best practices"
    - "Implement proper error handling"

governance:
  approvalStatus: "draft"
  riskLevel: "low"
  complianceFrameworks: ["gdpr"]
`,
        'README.md': `# Simple CRM System

## Overview
A basic customer relationship management system built with ESL specifications.

## Getting Started

### Validate the specification
\`\`\`bash
esl validate simple-crm.esl.yaml --strict
\`\`\`

### Generate TypeScript code
\`\`\`bash
esl generate typescript simple-crm.esl.yaml -o ./src
\`\`\`

### Generate documentation
\`\`\`bash
esl generate documentation simple-crm.esl.yaml -o ./docs
\`\`\`

## Project Structure
- \`simple-crm.esl.yaml\` - Main ESL specification
- \`src/\` - Generated TypeScript code
- \`docs/\` - Generated documentation
- \`tests/\` - Test files

## Development
1. Modify the ESL specification as needed
2. Regenerate code using ESL CLI
3. Run tests to verify functionality
`,
        '.gitignore': `# Dependencies
node_modules/
npm-debug.log*

# Generated files
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
`
      }
    },
    advanced: {
      name: 'Simple CRM - Advanced',
      description: 'Advanced CRM with workflows and API endpoints',
      directories: ['src', 'docs', 'tests', 'api'],
      files: {
        'simple-crm.esl.yaml': `# Advanced Simple CRM ESL Specification
metadata:
  version: "1.0.0"
  id: "simple-crm-advanced"
  title: "Advanced Simple CRM System"
  description: "CRM with workflows and API endpoints"
  author: "ESL Framework"
  created: "${new Date().toISOString()}"

businessRules:
  - id: "lead-qualification"
    name: "Lead Qualification"
    description: "Leads must be qualified before conversion"
    condition: "lead status changes to qualified"
    action: "validate lead score and contact attempts"
    priority: 1
    enabled: true
    exceptions:
      - id: "referral-exception"
        condition: "lead source is referral"
        action: "auto-qualify referral leads"
        reason: "Referrals have higher conversion rate"

dataStructures:
  - id: "customer"
    name: "Customer"
    type: "object"
    description: "Customer entity"
    fields:
      - name: "id"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: true
      - name: "leadId"
        type: "reference"
        referenceTo: "lead"
        required: false

  - id: "lead"
    name: "Lead"
    type: "object"
    description: "Sales lead entity"
    fields:
      - name: "id"
        type: "string"
        required: true
      - name: "score"
        type: "number"
        required: true
      - name: "status"
        type: "enum"
        enumValues: ["new", "contacted", "qualified", "converted"]
        required: true

apiEndpoints:
  - id: "create-customer"
    name: "Create Customer"
    path: "/api/customers"
    method: "POST"
    description: "Create a new customer"
    responses:
      - statusCode: 201
        description: "Customer created successfully"
      - statusCode: 400
        description: "Invalid customer data"

workflowSteps:
  - id: "lead-to-customer"
    name: "Convert Lead to Customer"
    type: "action"
    description: "Convert qualified lead to customer"
    condition: "lead.status === 'qualified'"
    action: "createCustomerFromLead(lead)"
    dependencies: []

aiContext:
  modelHints:
    - "@generation_target: typescript_express_api"
    - "@architectural_pattern: microservices"
  tokenOptimization:
    maxTokens: 4000
    compressionLevel: "medium"

governance:
  approvalStatus: "pending"
  riskLevel: "medium"
  complianceFrameworks: ["gdpr", "ccpa"]
`
      }
    }
  },
  'api-service': {
    basic: {
      name: 'API Service - Basic',
      description: 'RESTful API service specification',
      directories: ['src', 'docs', 'tests'],
      files: {
        'api-service.esl.yaml': `# API Service ESL Specification
metadata:
  version: "1.0.0"
  id: "api-service"
  title: "RESTful API Service"
  description: "Basic REST API service"
  author: "ESL Framework"
  created: "${new Date().toISOString()}"

businessRules:
  - id: "authentication-required"
    name: "Authentication Required"
    description: "All API endpoints require authentication"
    condition: "API request is made"
    action: "validate authentication token"
    priority: 1
    enabled: true

apiEndpoints:
  - id: "get-users"
    name: "Get Users"
    path: "/api/users"
    method: "GET"
    description: "Retrieve list of users"
    responses:
      - statusCode: 200
        description: "Users retrieved successfully"
      - statusCode: 401
        description: "Unauthorized"

  - id: "create-user"
    name: "Create User"
    path: "/api/users"
    method: "POST"
    description: "Create a new user"
    responses:
      - statusCode: 201
        description: "User created successfully"
      - statusCode: 400
        description: "Invalid user data"

dataStructures:
  - id: "user"
    name: "User"
    type: "object"
    description: "User entity"
    fields:
      - name: "id"
        type: "string"
        required: true
      - name: "username"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: true

governance:
  approvalStatus: "draft"
  riskLevel: "low"
`
      }
    }
  },
  'enterprise-system': {
    basic: {
      name: 'Enterprise System - Basic',
      description: 'Enterprise-grade system with governance',
      directories: ['src', 'docs', 'tests', 'governance'],
      files: {
        'enterprise-system.esl.yaml': `# Enterprise System ESL Specification
metadata:
  version: "1.0.0"
  id: "enterprise-system"
  title: "Enterprise Management System"
  description: "Enterprise-grade system with full governance"
  author: "ESL Framework"
  created: "${new Date().toISOString()}"

businessRules:
  - id: "compliance-audit"
    name: "Compliance Audit Trail"
    description: "All changes must be audited for compliance"
    condition: "data is modified"
    action: "log change with user and timestamp"
    priority: 1
    enabled: true

governance:
  approvalStatus: "approved"
  approvedBy: "enterprise_architect"
  approvalDate: "${new Date().toISOString()}"
  riskLevel: "high"
  complianceFrameworks: ["sox", "gdpr", "hipaa"]
  auditTrail:
    - timestamp: "${new Date().toISOString()}"
      user: "system"
      action: "specification_created"
      details: "Initial enterprise system specification"

aiContext:
  modelHints:
    - "@generation_target: enterprise_java_spring"
    - "@architectural_pattern: event_driven_architecture"
  tokenOptimization:
    maxTokens: 8000
    compressionLevel: "high"
    priorityFields: ["businessRules", "governance"]
`
      }
    }
  }
};

export async function initCommand(
  projectType: string,
  options: InitOptions
): Promise<void> {
  const spinner = ora('Initializing ESL project...').start();

  try {
    // Validate project type
    if (!PROJECT_TEMPLATES[projectType]) {
      spinner.fail(`Unknown project type: ${projectType}`);
      console.log(chalk.yellow('Available project types:'));
      Object.keys(PROJECT_TEMPLATES).forEach(type => {
        console.log(`  - ${chalk.cyan(type)}`);
      });
      return;
    }

    // Validate template
    const templates = PROJECT_TEMPLATES[projectType];
    if (!templates || !templates[options.template]) {
      spinner.fail(`Unknown template: ${options.template} for project type: ${projectType}`);
      console.log(chalk.yellow('Available templates:'));
      if (templates) {
        Object.keys(templates).forEach(template => {
          console.log(`  - ${chalk.cyan(template)}: ${templates[template]!.description}`);
        });
      }
      return;
    }

    const template = templates[options.template]!;
    const targetDir = resolve(options.directory);

    spinner.text = 'Checking target directory...';

    // Check if directory exists and has content
    try {
      const files = await fs.readdir(targetDir);
      if (files.length > 0) {
        spinner.stop();
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${targetDir} is not empty. Continue anyway?`,
            default: false
          }
        ]);
        
        if (!overwrite) {
          console.log(chalk.yellow('Project initialization cancelled.'));
          return;
        }
        spinner.start('Creating project structure...');
      }
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(targetDir, { recursive: true });
    }

    spinner.text = 'Creating project structure...';

    // Create directories
    for (const dir of template.directories) {
      await fs.mkdir(join(targetDir, dir), { recursive: true });
    }

    spinner.text = 'Generating project files...';

    // Create files
    for (const [filename, content] of Object.entries(template.files)) {
      await fs.writeFile(join(targetDir, filename), content, 'utf-8');
    }

    // Initialize git repository if requested
    if (options.git) {
      spinner.text = 'Initializing git repository...';
      try {
        await execAsync('git init', { cwd: targetDir });
        await execAsync('git add .', { cwd: targetDir });
        await execAsync('git commit -m "Initial commit: ESL project setup"', { cwd: targetDir });
      } catch (error) {
        console.warn(chalk.yellow('Warning: Failed to initialize git repository'));
      }
    }

    spinner.succeed(`Successfully initialized ${chalk.cyan(template.name)} project!`);

    // Show next steps
    console.log();
    console.log(chalk.green('✨ Project created successfully!'));
    console.log();
    console.log(chalk.yellow('Next steps:'));
    console.log(`  ${chalk.cyan('cd')} ${options.directory}`);
    console.log(`  ${chalk.cyan('esl validate')} *.esl.yaml`);
    console.log(`  ${chalk.cyan('esl generate typescript')} -o ./src`);
    console.log();
    console.log(chalk.gray('For more commands, run:')); 
    console.log(`  ${chalk.cyan('esl --help')}`);

  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    
    if (process.env.ESL_VERBOSE === 'true') {
      console.error(error);
    }
    
    process.exit(1);
  }
}