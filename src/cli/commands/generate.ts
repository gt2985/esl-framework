import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join, resolve, dirname, basename, extname } from 'path';
import { performance } from 'perf_hooks';

import { ESLFramework } from '../../index.js';
import { ESLDocument, ESLValidationResult } from '../../core/types.js';

interface GenerateOptions {
  output: string;
  context?: string;
  template?: string;
  noMetadata: boolean;
}

interface GenerationResult {
  target: string;
  files: Array<{
    path: string;
    content: string;
    type: 'code' | 'documentation' | 'config' | 'test';
  }>;
  metadata: {
    source: string;
    generatedAt: string;
    totalTime: number;
    framework: string;
  };
}

const SUPPORTED_TARGETS = [
  'typescript',
  'openapi', 
  'documentation',
  'tests'
] as const;

type GenerationTarget = typeof SUPPORTED_TARGETS[number];

export async function generateCommand(
  target: string,
  input: string,
  options: GenerateOptions
): Promise<void> {
  const startTime = performance.now();
  const spinner = ora('Starting code generation...').start();

  try {
    // Validate target
    if (!SUPPORTED_TARGETS.includes(target as GenerationTarget)) {
      spinner.fail(`Unsupported generation target: ${target}`);
      console.log(chalk.yellow('Supported targets:'));
      SUPPORTED_TARGETS.forEach(t => {
        console.log(`  - ${chalk.cyan(t)}`);
      });
      return;
    }

    // Validate input file
    spinner.text = 'Validating input specification...';
    const inputPath = resolve(input);
    
    try {
      await fs.access(inputPath);
    } catch (error) {
      spinner.fail(`Input file not found: ${input}`);
      console.log(chalk.yellow('Tip: Make sure the ESL specification file exists'));
      return;
    }

    // Initialize ESL framework
    const framework = new ESLFramework({
      validateSchema: true,
      resolveInheritance: true,
      enableSemanticAnalysis: false,
      optimizeForAI: false
    });

    // Parse and validate input specification
    spinner.text = 'Parsing ESL specification...';
    const parseResult = await framework.parseFile(inputPath);
    
    if (!parseResult.valid || !parseResult.document) {
      spinner.fail('Failed to parse ESL specification');
      console.log(chalk.red('Parse errors:'));
      parseResult.errors.forEach(error => {
        console.log(`  ${chalk.red('✗')} ${error.message}${error.line > 0 ? ` (line ${error.line})` : ''}`);
      });
      return;
    }

    spinner.succeed('ESL specification parsed successfully');

    // Generate based on target
    const generateSpinner = ora(`Generating ${target} code...`).start();
    
    const result = await generateCode(
      target as GenerationTarget,
      parseResult.document,
      inputPath,
      options
    );

    generateSpinner.succeed(`Generated ${result.files.length} file${result.files.length === 1 ? '' : 's'}`);

    // Write generated files
    const writeSpinner = ora('Writing generated files...').start();
    await writeGeneratedFiles(result, options.output);
    writeSpinner.succeed(`Files written to ${chalk.cyan(options.output)}`);

    const totalTime = performance.now() - startTime;

    // Display generation summary
    console.log();
    console.log(chalk.green('✨ Code generation completed successfully!'));
    console.log();
    console.log(chalk.bold('Generation Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Target: ${chalk.cyan(target)}`);
    console.log(`Source: ${chalk.gray(basename(inputPath))}`);
    console.log(`Output: ${chalk.cyan(options.output)}`);
    console.log(`Files generated: ${result.files.length}`);
    console.log(`Total time: ${chalk.cyan(totalTime.toFixed(1))}ms`);
    
    // Show generated files by type
    const filesByType = result.files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log();
    console.log(chalk.gray('Files by type:'));
    Object.entries(filesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log();
    console.log(chalk.yellow('Next steps:'));
    console.log(`  ${chalk.cyan('cd')} ${options.output}`);
    
    if (target === 'typescript') {
      console.log(`  ${chalk.cyan('npm install')} # Install dependencies`);
      console.log(`  ${chalk.cyan('npm run build')} # Build the project`);
    } else if (target === 'documentation') {
      console.log(`  Open ${chalk.cyan('index.html')} in your browser`);
    }

  } catch (error) {
    spinner.fail('Generation failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    
    if (process.env.ESL_VERBOSE === 'true') {
      console.error(error);
    }
    
    process.exit(1);
  }
}

async function generateCode(
  target: GenerationTarget,
  document: ESLDocument,
  sourcePath: string,
  options: GenerateOptions
): Promise<GenerationResult> {
  const generatedAt = new Date().toISOString();
  const framework = `ESL Framework v${getFrameworkVersion()}`;

  switch (target) {
    case 'typescript':
      return generateTypeScript(document, sourcePath, { generatedAt, framework }, options);
    
    case 'openapi':
      return generateOpenAPI(document, sourcePath, { generatedAt, framework }, options);
    
    case 'documentation':
      return generateDocumentation(document, sourcePath, { generatedAt, framework }, options);
    
    case 'tests':
      return generateTests(document, sourcePath, { generatedAt, framework }, options);
    
    default:
      throw new Error(`Unsupported generation target: ${target}`);
  }
}

async function generateTypeScript(
  document: ESLDocument,
  sourcePath: string,
  metadata: { generatedAt: string; framework: string },
  options: GenerateOptions
): Promise<GenerationResult> {
  const files: GenerationResult['files'] = [];
  
  // Generate TypeScript interfaces from data structures
  if (document.dataStructures && document.dataStructures.length > 0) {
    const interfaceContent = generateTypeScriptInterfaces(document, metadata);
    files.push({
      path: 'types.ts',
      content: interfaceContent,
      type: 'code'
    });
  }

  // Generate business rule validators
  if (document.businessRules && document.businessRules.length > 0) {
    const validatorContent = generateBusinessRuleValidators(document, metadata);
    files.push({
      path: 'validators.ts',
      content: validatorContent,
      type: 'code'
    });
  }

  // Generate API client (if API endpoints exist)
  if (document.apiEndpoints && document.apiEndpoints.length > 0) {
    const apiContent = generateAPIClient(document, metadata);
    files.push({
      path: 'api.ts',
      content: apiContent,
      type: 'code'
    });
  }

  // Generate main index file
  const indexContent = generateTypeScriptIndex(document, metadata, files);
  files.push({
    path: 'index.ts',
    content: indexContent,
    type: 'code'
  });

  // Generate package.json
  const packageJsonContent = generatePackageJson(document, metadata);
  files.push({
    path: 'package.json',
    content: packageJsonContent,
    type: 'config'
  });

  // Generate tsconfig.json
  const tsconfigContent = generateTsConfig();
  files.push({
    path: 'tsconfig.json',
    content: tsconfigContent,
    type: 'config'
  });

  return {
    target: 'typescript',
    files,
    metadata: {
      source: sourcePath,
      generatedAt: metadata.generatedAt,
      totalTime: 0,
      framework: metadata.framework
    }
  };
}

async function generateOpenAPI(
  document: ESLDocument,
  sourcePath: string,
  metadata: { generatedAt: string; framework: string },
  options: GenerateOptions
): Promise<GenerationResult> {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: document.metadata?.title || 'API Specification',
      description: document.metadata?.description || 'Generated from ESL specification',
      version: document.metadata?.version || '1.0.0',
      'x-generated-by': metadata.framework,
      'x-generated-at': metadata.generatedAt
    },
    servers: [
      {
        url: 'https://api.example.com/v1',
        description: 'Production server'
      }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] as any[] }]
  };

  // Generate schemas from data structures
  if (document.dataStructures) {
    for (const dataStructure of document.dataStructures) {
      const schemas = openApiSpec.components.schemas as Record<string, any>;
      schemas[dataStructure.name] = generateOpenAPISchema(dataStructure);
    }
  }

  // Generate paths from API endpoints
  if (document.apiEndpoints) {
    const paths = openApiSpec.paths as Record<string, any>;
    for (const endpoint of document.apiEndpoints) {
      const path = endpoint.path;
      if (!paths[path]) {
        paths[path] = {};
      }
      paths[path][endpoint.method.toLowerCase()] = generateOpenAPIOperation(endpoint);
    }
  }

  const content = JSON.stringify(openApiSpec, null, 2);

  return {
    target: 'openapi',
    files: [{
      path: 'openapi.json',
      content,
      type: 'documentation'
    }],
    metadata: {
      source: sourcePath,
      generatedAt: metadata.generatedAt,
      totalTime: 0,
      framework: metadata.framework
    }
  };
}

async function generateDocumentation(
  document: ESLDocument,
  sourcePath: string,
  metadata: { generatedAt: string; framework: string },
  options: GenerateOptions
): Promise<GenerationResult> {
  const files: GenerationResult['files'] = [];

  // Generate main documentation HTML
  const htmlContent = generateDocumentationHTML(document, metadata);
  files.push({
    path: 'index.html',
    content: htmlContent,
    type: 'documentation'
  });

  // Generate markdown documentation
  const markdownContent = generateDocumentationMarkdown(document, metadata);
  files.push({
    path: 'README.md',
    content: markdownContent,
    type: 'documentation'
  });

  // Generate business rules documentation
  if (document.businessRules && document.businessRules.length > 0) {
    const rulesContent = generateBusinessRulesDoc(document, metadata);
    files.push({
      path: 'business-rules.md',
      content: rulesContent,
      type: 'documentation'
    });
  }

  return {
    target: 'documentation',
    files,
    metadata: {
      source: sourcePath,
      generatedAt: metadata.generatedAt,
      totalTime: 0,
      framework: metadata.framework
    }
  };
}

async function generateTests(
  document: ESLDocument,
  sourcePath: string,
  metadata: { generatedAt: string; framework: string },
  options: GenerateOptions
): Promise<GenerationResult> {
  const files: GenerationResult['files'] = [];

  // Generate Jest configuration
  const jestConfigContent = generateJestConfig();
  files.push({
    path: 'jest.config.js',
    content: jestConfigContent,
    type: 'config'
  });

  // Generate data structure tests
  if (document.dataStructures && document.dataStructures.length > 0) {
    const dataTestContent = generateDataStructureTests(document, metadata);
    files.push({
      path: 'tests/data-structures.test.ts',
      content: dataTestContent,
      type: 'test'
    });
  }

  // Generate business rule tests
  if (document.businessRules && document.businessRules.length > 0) {
    const rulesTestContent = generateBusinessRuleTests(document, metadata);
    files.push({
      path: 'tests/business-rules.test.ts',
      content: rulesTestContent,
      type: 'test'
    });
  }

  // Generate API endpoint tests
  if (document.apiEndpoints && document.apiEndpoints.length > 0) {
    const apiTestContent = generateAPITests(document, metadata);
    files.push({
      path: 'tests/api.test.ts',
      content: apiTestContent,
      type: 'test'
    });
  }

  return {
    target: 'tests',
    files,
    metadata: {
      source: sourcePath,
      generatedAt: metadata.generatedAt,
      totalTime: 0,
      framework: metadata.framework
    }
  };
}

// Helper functions for TypeScript generation
function generateTypeScriptInterfaces(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated TypeScript types from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

`;

  let content = header;

  if (document.dataStructures) {
    for (const dataStructure of document.dataStructures) {
      content += `/**
 * ${dataStructure.description || `${dataStructure.name} data structure`}
 */
export interface ${dataStructure.name} {
`;

      if (dataStructure.fields) {
        for (const field of dataStructure.fields) {
          const optional = field.required ? '' : '?';
          const tsType = mapESLTypeToTypeScript(field.type);
          const comment = field.description ? ` // ${field.description}` : '';
          content += `  ${field.name}${optional}: ${tsType};${comment}\n`;
        }
      }

      content += '}\n\n';
    }
  }

  return content;
}

function generateBusinessRuleValidators(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated business rule validators from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

`;

  let content = header;

  if (document.businessRules) {
    for (const rule of document.businessRules) {
      content += `/**
 * ${rule.description}
 * Priority: ${rule.priority}
 * Enabled: ${rule.enabled}
 */
export function validate${rule.name.replace(/\s+/g, '')}(data: any): ValidationResult {
  const errors: string[] = [];
  
  // TODO: Implement validation logic for: ${rule.condition}
  // Action: ${rule.action}
  
  return {
    valid: errors.length === 0,
    errors
  };
}

`;
    }
  }

  return content;
}

function generateAPIClient(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated API client from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

export class APIClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, data?: any): Promise<T> {
    const url = \`\${this.baseUrl}\${path}\`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = \`Bearer \${this.apiKey}\`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(\`API request failed: \${response.statusText}\`);
    }

    return response.json();
  }

`;

  let content = header;

  if (document.apiEndpoints) {
    for (const endpoint of document.apiEndpoints) {
      const methodName = endpoint.name.replace(/\s+/g, '').toLowerCase();
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
      const params = hasBody ? 'data: any' : '';
      
      content += `  /**
   * ${endpoint.description}
   */
  async ${methodName}(${params}): Promise<any> {
    return this.request('${endpoint.method}', '${endpoint.path}'${hasBody ? ', data' : ''});
  }

`;
    }
  }

  content += '}\n';
  return content;
}

function generateTypeScriptIndex(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string },
  files: GenerationResult['files']
): string {
  const header = `/**
 * Generated main index from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

`;

  let exports: string[] = [];

  // Add exports based on generated files
  files.forEach(file => {
    if (file.type === 'code' && file.path.endsWith('.ts') && file.path !== 'index.ts') {
      const moduleName = file.path.replace('.ts', '');
      exports.push(`export * from './${moduleName}';`);
    }
  });

  return header + exports.join('\n') + '\n';
}

function generatePackageJson(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const packageJson = {
    name: document.metadata?.id || 'esl-generated-project',
    version: document.metadata?.version || '1.0.0',
    description: document.metadata?.description || 'Generated from ESL specification',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      'build:watch': 'tsc --watch',
      test: 'jest',
      'test:watch': 'jest --watch'
    },
    devDependencies: {
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
      jest: '^29.0.0',
      '@types/jest': '^29.0.0',
      'ts-jest': '^29.0.0'
    },
    dependencies: {},
    keywords: ['esl', 'generated', 'typescript'],
    author: document.metadata?.author || 'ESL Framework',
    license: 'MIT',
    'x-generated-by': metadata.framework,
    'x-generated-at': metadata.generatedAt
  };

  return JSON.stringify(packageJson, null, 2);
}

function generateTsConfig(): string {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020'],
      module: 'commonjs',
      declaration: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'tests']
  };

  return JSON.stringify(tsconfig, null, 2);
}

// Helper functions for other generators
function generateOpenAPISchema(dataStructure: any): any {
  const schema: any = {
    type: 'object',
    description: dataStructure.description,
    properties: {},
    required: []
  };

  if (dataStructure.fields) {
    for (const field of dataStructure.fields) {
      schema.properties[field.name] = {
        type: mapESLTypeToOpenAPI(field.type),
        description: field.description
      };

      if (field.required) {
        schema.required.push(field.name);
      }
    }
  }

  return schema;
}

function generateOpenAPIOperation(endpoint: any): any {
  return {
    summary: endpoint.name,
    description: endpoint.description,
    responses: endpoint.responses?.reduce((acc: any, response: any) => {
      acc[response.statusCode] = {
        description: response.description
      };
      return acc;
    }, {}) || {
      '200': { description: 'Success' }
    },
    security: [{ bearerAuth: [] as any[] }]
  };
}

function generateDocumentationHTML(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.metadata?.title || 'ESL Documentation'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #e1e8ed; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .business-rule { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0; }
        .api-endpoint { background: #f1f8ff; padding: 15px; border-left: 4px solid #0366d6; margin: 10px 0; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e1e8ed; color: #657786; font-size: 0.9em; }
        code { background: #f1f8ff; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${document.metadata?.title || 'ESL Documentation'}</h1>
        <p>${document.metadata?.description || 'Generated from ESL specification'}</p>
        <p><strong>Version:</strong> ${document.metadata?.version || '1.0.0'}</p>
    </div>

    ${document.businessRules ? `
    <div class="section">
        <h2>Business Rules</h2>
        ${document.businessRules.map(rule => `
        <div class="business-rule">
            <h3>${rule.name}</h3>
            <p>${rule.description}</p>
            <p><strong>Condition:</strong> <code>${rule.condition}</code></p>
            <p><strong>Action:</strong> <code>${rule.action}</code></p>
            <p><strong>Priority:</strong> ${rule.priority} | <strong>Enabled:</strong> ${rule.enabled}</p>
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${document.apiEndpoints ? `
    <div class="section">
        <h2>API Endpoints</h2>
        ${document.apiEndpoints.map(endpoint => `
        <div class="api-endpoint">
            <h3>${endpoint.method} ${endpoint.path}</h3>
            <p>${endpoint.description}</p>
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by ${metadata.framework} at ${metadata.generatedAt}</p>
    </div>
</body>
</html>`;
}

function generateDocumentationMarkdown(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  let content = `# ${document.metadata?.title || 'ESL Documentation'}\n\n`;
  content += `${document.metadata?.description || 'Generated from ESL specification'}\n\n`;
  content += `**Version:** ${document.metadata?.version || '1.0.0'}\n\n`;

  if (document.businessRules) {
    content += `## Business Rules\n\n`;
    for (const rule of document.businessRules) {
      content += `### ${rule.name}\n\n`;
      content += `${rule.description}\n\n`;
      content += `- **Condition:** \`${rule.condition}\`\n`;
      content += `- **Action:** \`${rule.action}\`\n`;
      content += `- **Priority:** ${rule.priority}\n`;
      content += `- **Enabled:** ${rule.enabled}\n\n`;
    }
  }

  if (document.apiEndpoints) {
    content += `## API Endpoints\n\n`;
    for (const endpoint of document.apiEndpoints) {
      content += `### ${endpoint.method} ${endpoint.path}\n\n`;
      content += `${endpoint.description}\n\n`;
    }
  }

  content += `\n---\n*Generated by ${metadata.framework} at ${metadata.generatedAt}*\n`;
  return content;
}

function generateBusinessRulesDoc(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  let content = `# Business Rules\n\n`;
  
  if (document.businessRules) {
    for (const rule of document.businessRules) {
      content += `## ${rule.name}\n\n`;
      content += `**ID:** \`${rule.id}\`\n\n`;
      content += `**Description:** ${rule.description}\n\n`;
      content += `**Condition:** \`${rule.condition}\`\n\n`;
      content += `**Action:** \`${rule.action}\`\n\n`;
      content += `**Priority:** ${rule.priority}\n\n`;
      content += `**Status:** ${rule.enabled ? 'Enabled' : 'Disabled'}\n\n`;
      
      if (rule.exceptions && rule.exceptions.length > 0) {
        content += `### Exceptions\n\n`;
        for (const exception of rule.exceptions) {
          content += `- **${exception.id}:** ${exception.reason}\n`;
          content += `  - Condition: \`${exception.condition}\`\n`;
          content += `  - Action: \`${exception.action}\`\n`;
        }
        content += '\n';
      }
      
      content += '---\n\n';
    }
  }

  content += `\n*Generated by ${metadata.framework} at ${metadata.generatedAt}*\n`;
  return content;
}

// Test generation helpers
function generateJestConfig(): string {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
`;
}

function generateDataStructureTests(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated data structure tests from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

`;

  let content = header;

  if (document.dataStructures) {
    for (const dataStructure of document.dataStructures) {
      content += `describe('${dataStructure.name}', () => {
  it('should validate required fields', () => {
    // TODO: Implement validation tests for ${dataStructure.name}
    expect(true).toBe(true);
  });

  it('should handle optional fields correctly', () => {
    // TODO: Implement optional field tests for ${dataStructure.name}
    expect(true).toBe(true);
  });
});

`;
    }
  }

  return content;
}

function generateBusinessRuleTests(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated business rule tests from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

`;

  let content = header;

  if (document.businessRules) {
    for (const rule of document.businessRules) {
      content += `describe('${rule.name}', () => {
  it('should validate when condition is met', () => {
    // TODO: Test condition: ${rule.condition}
    // TODO: Test action: ${rule.action}
    expect(true).toBe(true);
  });

  it('should handle edge cases', () => {
    // TODO: Implement edge case tests for ${rule.name}
    expect(true).toBe(true);
  });
});

`;
    }
  }

  return content;
}

function generateAPITests(
  document: ESLDocument,
  metadata: { generatedAt: string; framework: string }
): string {
  const header = `/**
 * Generated API tests from ESL specification
 * Generated by: ${metadata.framework}
 * Generated at: ${metadata.generatedAt}
 * 
 * DO NOT EDIT - This file is auto-generated
 */

`;

  let content = header;

  if (document.apiEndpoints) {
    for (const endpoint of document.apiEndpoints) {
      content += `describe('${endpoint.method} ${endpoint.path}', () => {
  it('should handle successful requests', () => {
    // TODO: Test successful ${endpoint.method} request to ${endpoint.path}
    expect(true).toBe(true);
  });

  it('should handle error responses', () => {
    // TODO: Test error handling for ${endpoint.method} ${endpoint.path}
    expect(true).toBe(true);
  });
});

`;
    }
  }

  return content;
}

// Utility functions
function mapESLTypeToTypeScript(eslType: string): string {
  switch (eslType.toLowerCase()) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'any[]';
    case 'object': return 'Record<string, any>';
    case 'reference': return 'string'; // Could be enhanced to use actual type
    case 'enum': return 'string'; // Could be enhanced to use union types
    default: return 'any';
  }
}

function mapESLTypeToOpenAPI(eslType: string): string {
  switch (eslType.toLowerCase()) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'array';
    case 'object': return 'object';
    case 'reference': return 'string';
    case 'enum': return 'string';
    default: return 'string';
  }
}

function getFrameworkVersion(): string {
  try {
    // This would read from package.json in a real implementation
    return '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

async function writeGeneratedFiles(result: GenerationResult, outputDir: string): Promise<void> {
  const resolvedOutputDir = resolve(outputDir);
  
  // Ensure output directory exists
  await fs.mkdir(resolvedOutputDir, { recursive: true });

  // Write each file
  for (const file of result.files) {
    const filePath = join(resolvedOutputDir, file.path);
    const fileDir = dirname(filePath);
    
    // Ensure subdirectory exists
    await fs.mkdir(fileDir, { recursive: true });
    
    // Write file content
    await fs.writeFile(filePath, file.content, 'utf-8');
  }
}