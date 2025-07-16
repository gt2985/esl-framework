import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { resolve, basename, extname } from 'path';
import { performance } from 'perf_hooks';

import { ESLDocument, ESLValidationResult } from '../../core/types.js';

interface ImportOptions {
  output: string;
  enhance: boolean;
  merge?: string;
  format?: string;
}

interface ImportInternalOptions {
  preserveMetadata: boolean;
}

interface ImportResult {
  source: string;
  document: ESLDocument;
  enhanced: boolean;
  metadata: {
    originalFormat: string;
    importedAt: string;
    totalTime: number;
    enhancementApplied: boolean;
  };
}

const SUPPORTED_SOURCES = [
  'openapi',
  'jira', 
  'github'
] as const;

type ImportSource = typeof SUPPORTED_SOURCES[number];

export async function importCommand(
  source: string,
  input: string,
  options: ImportOptions
): Promise<void> {
  const startTime = performance.now();
  const spinner = ora('Starting import process...').start();

  try {
    // Validate source
    if (!SUPPORTED_SOURCES.includes(source as ImportSource)) {
      spinner.fail(`Unsupported import source: ${source}`);
      console.log(chalk.yellow('Supported sources:'));
      SUPPORTED_SOURCES.forEach(s => {
        console.log(`  - ${chalk.cyan(s)}`);
      });
      return;
    }

    // Validate input
    spinner.text = 'Validating input source...';
    
    let inputContent: string;
    let inputFormat: string;
    
    if (input.startsWith('http://') || input.startsWith('https://')) {
      // Handle URL input
      spinner.text = 'Fetching remote content...';
      inputContent = await fetchRemoteContent(input);
      inputFormat = detectFormatFromUrl(input);
    } else {
      // Handle file input
      try {
        const inputPath = resolve(input);
        await fs.access(inputPath);
        inputContent = await fs.readFile(inputPath, 'utf-8');
        inputFormat = detectFormatFromFile(input);
      } catch (error) {
        spinner.fail(`Input file not found: ${input}`);
        console.log(chalk.yellow('Tip: Make sure the input file exists or provide a valid URL'));
        return;
      }
    }

    spinner.succeed('Input source validated');

    // Import based on source type
    const importSpinner = ora(`Importing from ${source}...`).start();
    
    const result = await importFromSource(
      source as ImportSource,
      inputContent,
      inputFormat,
      { preserveMetadata: true }
    );

    importSpinner.succeed(`Successfully imported from ${source}`);

    // Enhance with AI context if requested
    if (options.enhance) {
      const enhanceSpinner = ora('Enhancing with AI context...').start();
      await enhanceDocument(result.document, source as ImportSource);
      result.enhanced = true;
      result.metadata.enhancementApplied = true;
      enhanceSpinner.succeed('AI enhancement completed');
    }

    // Merge with existing specification if requested
    if (options.merge) {
      const mergeSpinner = ora('Merging with existing specification...').start();
      await mergeWithExisting(result.document, options.merge);
      mergeSpinner.succeed('Merge completed');
    }

    // Write output file
    const writeSpinner = ora('Writing ESL specification...').start();
    await writeESLDocument(result.document, options.output, result.metadata);
    writeSpinner.succeed(`ESL specification written to ${chalk.cyan(options.output)}`);

    const totalTime = performance.now() - startTime;

    // Display import summary
    console.log();
    console.log(chalk.green('✨ Import completed successfully!'));
    console.log();
    console.log(chalk.bold('Import Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Source: ${chalk.cyan(source)}`);
    console.log(`Input: ${chalk.gray(basename(input))}`);
    console.log(`Output: ${chalk.cyan(options.output)}`);
    console.log(`Format: ${result.metadata.originalFormat}`);
    console.log(`Enhanced: ${result.enhanced ? chalk.green('Yes') : chalk.gray('No')}`);
    console.log(`Total time: ${chalk.cyan(totalTime.toFixed(1))}ms`);

    // Show next steps
    console.log();
    console.log(chalk.yellow('Next steps:'));
    console.log(`  ${chalk.cyan('esl validate')} ${options.output} --strict`);
    console.log(`  ${chalk.cyan('esl generate typescript')} ${options.output} -o ./generated`);

  } catch (error) {
    spinner.fail('Import failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    
    if (process.env.ESL_VERBOSE === 'true') {
      console.error(error);
    }
    
    process.exit(1);
  }
}

async function importFromSource(
  source: ImportSource,
  content: string,
  format: string,
  options: ImportInternalOptions
): Promise<ImportResult> {
  const importedAt = new Date().toISOString();

  switch (source) {
    case 'openapi':
      return importFromOpenAPI(content, format, { importedAt, preserveMetadata: options.preserveMetadata });
    
    case 'jira':
      return importFromJira(content, format, { importedAt, preserveMetadata: options.preserveMetadata });
    
    case 'github':
      return importFromGitHub(content, format, { importedAt, preserveMetadata: options.preserveMetadata });
    
    default:
      throw new Error(`Unsupported import source: ${source}`);
  }
}

async function importFromOpenAPI(
  content: string,
  format: string,
  metadata: { importedAt: string; preserveMetadata: boolean }
): Promise<ImportResult> {
  let spec: any;
  
  try {
    if (format === 'json') {
      spec = JSON.parse(content);
    } else if (format === 'yaml' || format === 'yml') {
      // Use a YAML parser here - for now, assume JSON
      spec = JSON.parse(content);
    } else {
      throw new Error(`Unsupported OpenAPI format: ${format}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse OpenAPI specification: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Convert OpenAPI to ESL Document
  const eslDocument: ESLDocument = {
    metadata: {
      version: spec.info?.version || '1.0.0',
      id: generateId(spec.info?.title || 'imported-api'),
      title: spec.info?.title || 'Imported API Specification',
      description: spec.info?.description || 'Imported from OpenAPI specification',
      author: 'ESL Import Tool',
      created: metadata.importedAt,
      lastModified: metadata.importedAt
    },
    businessRules: [],
    dataStructures: [],
    apiEndpoints: [],
    workflowSteps: [],
    aiContext: {
      modelHints: [
        '@generation_target: api_service',
        '@architectural_pattern: rest_api'
      ],
      constraints: [
        'Follow OpenAPI 3.0 specifications',
        'Implement proper HTTP status codes',
        'Use JSON for request/response bodies'
      ],
      tokenOptimization: {
        maxTokens: 4000,
        compressionLevel: 'medium',
        priorityFields: ['apiEndpoints', 'dataStructures']
      }
    },
    governance: {
      approvalStatus: 'draft',
      riskLevel: 'medium',
      complianceFrameworks: []
    }
  };

  // Convert OpenAPI schemas to ESL data structures
  if (spec.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      eslDocument.dataStructures!.push(convertOpenAPISchemaToESL(schemaName, schema as any));
    }
  }

  // Convert OpenAPI paths to ESL API endpoints
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          eslDocument.apiEndpoints!.push(convertOpenAPIOperationToESL(path, method, operation as any));
        }
      }
    }
  }

  // Add business rules based on OpenAPI security requirements
  if (spec.security || spec.components?.securitySchemes) {
    eslDocument.businessRules!.push({
      id: 'api-authentication',
      name: 'API Authentication Required',
      description: 'All API endpoints require proper authentication',
      condition: 'API request is made',
      action: 'validate authentication token or credentials',
      priority: 1,
      enabled: true,
      exceptions: []
    });
  }

  return {
    source: 'openapi',
    document: eslDocument,
    enhanced: false,
    metadata: {
      originalFormat: format,
      importedAt: metadata.importedAt,
      totalTime: 0,
      enhancementApplied: false
    }
  };
}

async function importFromJira(
  content: string,
  format: string,
  metadata: { importedAt: string; preserveMetadata: boolean }
): Promise<ImportResult> {
  let jiraData: any;
  
  try {
    jiraData = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse Jira data: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Convert Jira issues/requirements to ESL Document
  const eslDocument: ESLDocument = {
    metadata: {
      version: '1.0.0',
      id: generateId('jira-import'),
      title: 'Jira Requirements Import',
      description: 'Business requirements imported from Jira',
      author: 'ESL Import Tool',
      created: metadata.importedAt,
      lastModified: metadata.importedAt
    },
    businessRules: [],
    dataStructures: [],
    apiEndpoints: [],
    workflowSteps: [],
    aiContext: {
      modelHints: [
        '@generation_target: business_application',
        '@architectural_pattern: feature_driven'
      ],
      constraints: [
        'Maintain traceability to Jira requirements',
        'Preserve business context and priorities'
      ],
      tokenOptimization: {
        maxTokens: 6000,
        compressionLevel: 'low',
        priorityFields: ['businessRules', 'workflowSteps']
      }
    },
    governance: {
      approvalStatus: 'pending',
      riskLevel: 'medium',
      complianceFrameworks: []
    }
  };

  // Convert Jira issues to business rules
  if (Array.isArray(jiraData.issues)) {
    for (const issue of jiraData.issues) {
      eslDocument.businessRules!.push(convertJiraIssueToBusinessRule(issue));
    }
  } else if (jiraData.key && jiraData.fields) {
    // Single issue
    eslDocument.businessRules!.push(convertJiraIssueToBusinessRule(jiraData));
  }

  return {
    source: 'jira',
    document: eslDocument,
    enhanced: false,
    metadata: {
      originalFormat: format,
      importedAt: metadata.importedAt,
      totalTime: 0,
      enhancementApplied: false
    }
  };
}

async function importFromGitHub(
  content: string,
  format: string,
  metadata: { importedAt: string; preserveMetadata: boolean }
): Promise<ImportResult> {
  let githubData: any;
  
  try {
    githubData = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse GitHub data: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Convert GitHub issues/discussions to ESL Document
  const eslDocument: ESLDocument = {
    metadata: {
      version: '1.0.0',
      id: generateId('github-import'),
      title: 'GitHub Requirements Import',
      description: 'Requirements imported from GitHub issues/discussions',
      author: 'ESL Import Tool',
      created: metadata.importedAt,
      lastModified: metadata.importedAt
    },
    businessRules: [],
    dataStructures: [],
    apiEndpoints: [],
    workflowSteps: [],
    aiContext: {
      modelHints: [
        '@generation_target: open_source_project',
        '@architectural_pattern: community_driven'
      ],
      constraints: [
        'Maintain issue traceability',
        'Preserve community input and feedback'
      ],
      tokenOptimization: {
        maxTokens: 5000,
        compressionLevel: 'medium',
        priorityFields: ['businessRules', 'workflowSteps']
      }
    },
    governance: {
      approvalStatus: 'draft',
      riskLevel: 'low',
      complianceFrameworks: []
    }
  };

  // Convert GitHub issues to business rules
  if (Array.isArray(githubData)) {
    for (const item of githubData) {
      if (item.title && item.body) {
        eslDocument.businessRules!.push(convertGitHubIssueToBusinessRule(item));
      }
    }
  } else if (githubData.title && githubData.body) {
    // Single issue
    eslDocument.businessRules!.push(convertGitHubIssueToBusinessRule(githubData));
  }

  return {
    source: 'github',
    document: eslDocument,
    enhanced: false,
    metadata: {
      originalFormat: format,
      importedAt: metadata.importedAt,
      totalTime: 0,
      enhancementApplied: false
    }
  };
}

// Conversion helper functions
function convertOpenAPISchemaToESL(name: string, schema: any): any {
  return {
    id: generateId(name),
    name: name,
    type: 'object',
    description: schema.description || `${name} data structure`,
    fields: schema.properties ? Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) => ({
      name: fieldName,
      type: mapOpenAPITypeToESL(fieldSchema.type || 'string'),
      required: schema.required?.includes(fieldName) || false,
      description: fieldSchema.description || `${fieldName} field`
    })) : []
  };
}

function convertOpenAPIOperationToESL(path: string, method: string, operation: any): any {
  return {
    id: generateId(`${method}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`),
    name: operation.summary || `${method.toUpperCase()} ${path}`,
    path: path,
    method: method.toUpperCase(),
    description: operation.description || operation.summary || `${method.toUpperCase()} operation for ${path}`,
    responses: operation.responses ? Object.entries(operation.responses).map(([code, response]: [string, any]) => ({
      statusCode: parseInt(code),
      description: response.description || `HTTP ${code} response`
    })) : []
  };
}

function convertJiraIssueToBusinessRule(issue: any): any {
  const priority = mapJiraPriorityToNumber(issue.fields?.priority?.name || 'Medium');
  
  return {
    id: issue.key || generateId('jira-rule'),
    name: issue.fields?.summary || 'Imported Jira Requirement',
    description: issue.fields?.description || issue.fields?.summary || 'Business requirement imported from Jira',
    condition: 'system operation requires this business rule',
    action: 'implement according to Jira specification',
    priority: priority,
    enabled: true,
    exceptions: [],
    metadata: {
      jiraKey: issue.key,
      jiraType: issue.fields?.issuetype?.name,
      jiraStatus: issue.fields?.status?.name,
      jiraAssignee: issue.fields?.assignee?.displayName
    }
  };
}

function convertGitHubIssueToBusinessRule(issue: any): any {
  const priority = mapGitHubLabelsToPriority(issue.labels || []);
  
  return {
    id: generateId(`github-${issue.number || 'issue'}`),
    name: issue.title || 'Imported GitHub Issue',
    description: issue.body || issue.title || 'Requirement imported from GitHub issue',
    condition: 'system operation requires this feature/fix',
    action: 'implement according to GitHub issue specification',
    priority: priority,
    enabled: issue.state === 'open',
    exceptions: [],
    metadata: {
      githubNumber: issue.number,
      githubState: issue.state,
      githubAuthor: issue.user?.login,
      githubLabels: issue.labels?.map((label: any) => label.name) || []
    }
  };
}

// Enhancement functions
async function enhanceDocument(document: ESLDocument, source: ImportSource): Promise<void> {
  // Add AI context enhancements based on source type
  switch (source) {
    case 'openapi':
      enhanceForAPI(document);
      break;
    case 'jira':
      enhanceForBusinessRequirements(document);
      break;
    case 'github':
      enhanceForOpenSource(document);
      break;
  }

  // Add general AI enhancements
  if (document.aiContext) {
    document.aiContext.modelHints = [
      ...document.aiContext.modelHints || [],
      '@enhanced_by_esl_import',
      '@context_optimized'
    ];

    document.aiContext.constraints = [
      ...document.aiContext.constraints || [],
      'Maintain import source traceability',
      'Preserve original business intent'
    ];
  }

  // Add governance enhancements
  if (document.governance) {
    document.governance.auditTrail = [
      ...(document.governance.auditTrail || []),
      {
        timestamp: new Date().toISOString(),
        user: 'esl-import-tool',
        action: 'ai_enhancement_applied',
        details: `Enhanced during import from ${source}`
      }
    ];
  }
}

function enhanceForAPI(document: ESLDocument): void {
  // Add API-specific business rules
  document.businessRules!.push({
    id: 'api-rate-limiting',
    name: 'API Rate Limiting',
    description: 'Implement rate limiting to prevent API abuse',
    condition: 'API request volume exceeds threshold',
    action: 'apply rate limiting and return 429 status',
    priority: 2,
    enabled: true,
    exceptions: []
  });

  // Enhance AI context for API generation
  if (document.aiContext) {
    document.aiContext.modelHints!.push(
      '@api_patterns: rest_with_openapi',
      '@security_patterns: oauth2_jwt'
    );
  }
}

function enhanceForBusinessRequirements(document: ESLDocument): void {
  // Add requirement traceability rules
  document.businessRules!.push({
    id: 'requirement-traceability',
    name: 'Requirement Traceability',
    description: 'All features must be traceable to original requirements',
    condition: 'feature is implemented',
    action: 'ensure traceability to source requirement',
    priority: 1,
    enabled: true,
    exceptions: []
  });
}

function enhanceForOpenSource(document: ESLDocument): void {
  // Add open source governance rules
  document.businessRules!.push({
    id: 'community-feedback',
    name: 'Community Feedback Integration',
    description: 'Consider community feedback in implementation decisions',
    condition: 'feature affects user experience',
    action: 'review community input and feedback',
    priority: 2,
    enabled: true,
    exceptions: []
  });
}

// Merge functions
async function mergeWithExisting(document: ESLDocument, mergePath: string): Promise<void> {
  try {
    const existingContent = await fs.readFile(resolve(mergePath), 'utf-8');
    const existingDoc = JSON.parse(existingContent); // Simplified - would use YAML parser
    
    // Merge business rules
    if (existingDoc.businessRules) {
      document.businessRules = [
        ...(document.businessRules || []),
        ...existingDoc.businessRules
      ];
    }

    // Merge data structures
    if (existingDoc.dataStructures) {
      document.dataStructures = [
        ...(document.dataStructures || []),
        ...existingDoc.dataStructures
      ];
    }

    // Update metadata
    if (document.metadata) {
      document.metadata.lastModified = new Date().toISOString();
      document.metadata.description = `${document.metadata.description} (merged with ${mergePath})`;
    }

  } catch (error) {
    throw new Error(`Failed to merge with existing file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Utility functions
async function fetchRemoteContent(url: string): Promise<string> {
  // Simplified - would use fetch or axios in real implementation
  throw new Error('Remote content fetching not implemented in this demo');
}

function detectFormatFromUrl(url: string): string {
  if (url.includes('.json')) return 'json';
  if (url.includes('.yaml') || url.includes('.yml')) return 'yaml';
  return 'json'; // default
}

function detectFormatFromFile(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.json': return 'json';
    case '.yaml':
    case '.yml': return 'yaml';
    default: return 'json';
  }
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapOpenAPITypeToESL(openApiType: string): string {
  switch (openApiType) {
    case 'string': return 'string';
    case 'number':
    case 'integer': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'array';
    case 'object': return 'object';
    default: return 'string';
  }
}

function mapJiraPriorityToNumber(priority: string): number {
  switch (priority.toLowerCase()) {
    case 'highest':
    case 'critical': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
    case 'lowest': return 5;
    default: return 3;
  }
}

function mapGitHubLabelsToPriority(labels: any[]): number {
  const priorityLabels = labels.map(label => (typeof label === 'string' ? label : label.name).toLowerCase());
  
  if (priorityLabels.some(label => label.includes('critical') || label.includes('urgent'))) return 1;
  if (priorityLabels.some(label => label.includes('high') || label.includes('important'))) return 2;
  if (priorityLabels.some(label => label.includes('low') || label.includes('minor'))) return 4;
  return 3; // default medium priority
}

async function writeESLDocument(
  document: ESLDocument, 
  outputPath: string, 
  metadata: { originalFormat: string; importedAt: string; enhancementApplied: boolean }
): Promise<void> {
  // Add import metadata to document
  if (document.metadata) {
    document.metadata.importMetadata = {
      originalFormat: metadata.originalFormat,
      importedAt: metadata.importedAt,
      enhanced: metadata.enhancementApplied,
      tool: 'ESL Import Tool'
    };
  }

  // Convert to YAML format (simplified - would use yaml library)
  const yamlContent = `# ESL Specification
# Generated by ESL Import Tool at ${metadata.importedAt}
# Original format: ${metadata.originalFormat}
# Enhanced: ${metadata.enhancementApplied}

metadata:
  version: "${document.metadata?.version || '1.0.0'}"
  id: "${document.metadata?.id || 'imported-spec'}"
  title: "${document.metadata?.title || 'Imported Specification'}"
  description: "${document.metadata?.description || 'Imported from external source'}"
  author: "${document.metadata?.author || 'ESL Import Tool'}"
  created: "${document.metadata?.created || metadata.importedAt}"
  lastModified: "${document.metadata?.lastModified || metadata.importedAt}"

businessRules:
${(document.businessRules || []).map(rule => `  - id: "${rule.id}"
    name: "${rule.name}"
    description: "${rule.description}"
    condition: "${rule.condition}"
    action: "${rule.action}"
    priority: ${rule.priority}
    enabled: ${rule.enabled}`).join('\n')}

${document.dataStructures && document.dataStructures.length > 0 ? `dataStructures:
${document.dataStructures.map(ds => `  - id: "${ds.id}"
    name: "${ds.name}"
    type: "${ds.type}"
    description: "${ds.description}"
    fields:
${(ds.fields || []).map(field => `      - name: "${field.name}"
        type: "${field.type}"
        required: ${field.required}
        description: "${field.description}"`).join('\n')}`).join('\n')}` : ''}

${document.apiEndpoints && document.apiEndpoints.length > 0 ? `apiEndpoints:
${document.apiEndpoints.map(endpoint => `  - id: "${endpoint.id}"
    name: "${endpoint.name}"
    path: "${endpoint.path}"
    method: "${endpoint.method}"
    description: "${endpoint.description}"
    responses:
${(endpoint.responses || []).map(response => `      - statusCode: ${response.statusCode}
        description: "${response.description}"`).join('\n')}`).join('\n')}` : ''}

aiContext:
  modelHints:
${(document.aiContext?.modelHints || []).map(hint => `    - "${hint}"`).join('\n')}
  constraints:
${(document.aiContext?.constraints || []).map(constraint => `    - "${constraint}"`).join('\n')}

governance:
  approvalStatus: "${document.governance?.approvalStatus || 'draft'}"
  riskLevel: "${document.governance?.riskLevel || 'medium'}"
  complianceFrameworks: ${JSON.stringify(document.governance?.complianceFrameworks || [])}
`;

  await fs.writeFile(resolve(outputPath), yamlContent, 'utf-8');
}