import * as yaml from 'yaml';
import { 
  ESLDocument, 
  ESLParseError, 
  ESLValidationResult,
  ProcessingContext,
  ESLMetadata,
  BusinessRule,
  DataStructure,
  APIEndpoint,
  WorkflowStep,
  AIContext,
  GovernanceMetadata,
  ImportStatement,
  ExportStatement
} from './types.js';
import { 
  ESLError, 
  createValidationResult, 
  validateIdentifier,
  validateDescription,
  resolveImportPath,
  normalizeFilePath 
} from './utils.js';

export interface ParsedYAMLNode {
  value: unknown;
  line: number;
  column: number;
  tag?: string;
}

export interface ParserOptions {
  strictMode: boolean;
  maxErrors: number;
  includeWarnings: boolean;
  validateOnParse: boolean;
}

export class ESLParser {
  private readonly options: ParserOptions;
  private errors: ESLParseError[] = [];
  private warnings: ESLParseError[] = [];
  private lineMap: Map<unknown, { line: number; column: number }> = new Map();

  constructor(options: Partial<ParserOptions> = {}) {
    this.options = {
      strictMode: false,
      maxErrors: 50,
      includeWarnings: true,
      validateOnParse: true,
      ...options
    };
  }

  async parseDocument(content: string, filePath?: string): Promise<ESLValidationResult> {
    this.reset();
    
    try {
      const document = yaml.parseDocument(content, {
        keepSourceTokens: true
      });

      if (document.errors.length > 0) {
        this.processYAMLErrors(document.errors);
      }

      if (document.warnings.length > 0 && this.options.includeWarnings) {
        this.processYAMLWarnings(document.warnings);
      }

      if (!document.contents) {
        this.addError('Document is empty or invalid', 0, 0, 'EMPTY_DOCUMENT');
        return this.createResult();
      }

      const eslDocument = this.parseESLDocument(document.contents, filePath);
      
      if (!eslDocument) {
        return this.createResult();
      }

      if (this.options.validateOnParse) {
        this.validateBasicStructure(eslDocument);
      }

      const isValid = this.errors.length === 0;
      return createValidationResult(isValid, this.errors, this.warnings, eslDocument);

    } catch (error) {
      if (error instanceof yaml.YAMLParseError) {
        this.addError(
          `YAML parse error: ${error.message}`,
          error.linePos?.[0]?.line || 0,
          error.linePos?.[0]?.col || 0,
          'YAML_PARSE_ERROR'
        );
      } else {
        this.addError(
          `Unexpected parse error: ${error instanceof Error ? error.message : String(error)}`,
          0,
          0,
          'UNEXPECTED_PARSE_ERROR'
        );
      }
      return this.createResult();
    }
  }

  private parseESLDocument(contents: yaml.Node, filePath?: string): ESLDocument | null {
    if (!yaml.isMap(contents)) {
      this.addError('ESL document must be a YAML object', 0, 0, 'INVALID_ROOT_TYPE');
      return null;
    }

    const document: Partial<ESLDocument> = {};

    for (const pair of contents.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);
      const line = pair.key.range?.[0] ? this.getLineNumber(pair.key.range[0]) : 0;
      const column = pair.key.range?.[0] ? this.getColumnNumber(pair.key.range[0]) : 0;

      try {
        switch (key) {
          case 'metadata':
            document.metadata = this.parseMetadata(pair.value as yaml.Node, line, column);
            break;
          case 'businessRules':
          case 'business_rules':
            document.businessRules = this.parseBusinessRules(pair.value as yaml.Node, line, column);
            break;
          case 'dataStructures':
          case 'data_structures':
            document.dataStructures = this.parseDataStructures(pair.value as yaml.Node, line, column);
            break;
          case 'apiEndpoints':
          case 'api_endpoints':
            document.apiEndpoints = this.parseAPIEndpoints(pair.value as yaml.Node, line, column);
            break;
          case 'workflowSteps':
          case 'workflow_steps':
            document.workflowSteps = this.parseWorkflowSteps(pair.value as yaml.Node, line, column);
            break;
          case 'aiContext':
          case 'ai_context':
            document.aiContext = this.parseAIContext(pair.value as yaml.Node, line, column);
            break;
          case 'governance':
            document.governance = this.parseGovernance(pair.value as yaml.Node, line, column);
            break;
          case 'extends':
            document.extends = this.parseExtends(pair.value as yaml.Node, line, column);
            break;
          case 'imports':
            document.imports = this.parseImports(pair.value as yaml.Node, line, column);
            break;
          case 'exports':
            document.exports = this.parseExports(pair.value as yaml.Node, line, column);
            break;
          default:
            if (this.options.strictMode) {
              this.addError(`Unknown property: ${key}`, line, column, 'UNKNOWN_PROPERTY');
            } else {
              this.addWarning(`Unknown property: ${key}`, line, column, 'UNKNOWN_PROPERTY');
            }
        }
      } catch (error) {
        this.addError(
          `Error parsing ${key}: ${error instanceof Error ? error.message : String(error)}`,
          line,
          column,
          'PARSE_SECTION_ERROR'
        );
      }
    }

    if (!document.metadata) {
      this.addError('ESL document must have metadata section', 0, 0, 'MISSING_METADATA');
      return null;
    }

    return document as ESLDocument;
  }

  private parseMetadata(node: yaml.Node | null, line: number, column: number): ESLMetadata | undefined {
    if (!node || !yaml.isMap(node)) {
      this.addError('Metadata must be an object', line, column, 'INVALID_METADATA_TYPE');
      return undefined;
    }

    const metadata: Partial<ESLMetadata> = {};

    for (const pair of node.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);
      const value = yaml.isScalar(pair.value) ? pair.value.value : undefined;

      switch (key) {
        case 'version':
          metadata.version = String(value || '1.0.0');
          break;
        case 'id':
          metadata.id = String(value || '');
          break;
        case 'title':
          metadata.title = String(value || '');
          break;
        case 'description':
          metadata.description = value ? String(value) : undefined;
          break;
        case 'author':
          metadata.author = value ? String(value) : undefined;
          break;
        case 'created':
          metadata.created = value ? String(value) : undefined;
          break;
        case 'lastModified':
        case 'last_modified':
          metadata.lastModified = value ? String(value) : undefined;
          break;
        case 'tags':
          metadata.tags = this.parseStringArray(pair.value as yaml.Node);
          break;
      }
    }

    if (!metadata.version || !metadata.id || !metadata.title) {
      this.addError('Metadata must include version, id, and title', line, column, 'INCOMPLETE_METADATA');
    }

    return metadata as ESLMetadata;
  }

  private parseBusinessRules(node: yaml.Node | null, line: number, column: number): BusinessRule[] | undefined {
    if (!yaml.isSeq(node)) {
      this.addError('Business rules must be an array', line, column, 'INVALID_BUSINESS_RULES_TYPE');
      return undefined;
    }

    const rules: BusinessRule[] = [];

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      if (!yaml.isMap(item)) {
        this.addError(`Business rule ${i} must be an object`, line, column, 'INVALID_BUSINESS_RULE_TYPE');
        continue;
      }

      const rule = this.parseBusinessRule(item as yaml.YAMLMap, line, column);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }

  private parseBusinessRule(node: yaml.YAMLMap, line: number, column: number): BusinessRule | null {
    const rule: Partial<BusinessRule> = {
      enabled: true,
      priority: 1,
      exceptions: []
    };

    for (const pair of node.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);
      const value = yaml.isScalar(pair.value) ? pair.value.value : pair.value;

      switch (key) {
        case 'id':
          rule.id = String(value);
          break;
        case 'name':
          rule.name = String(value);
          break;
        case 'description':
          rule.description = String(value);
          break;
        case 'condition':
          rule.condition = String(value);
          break;
        case 'action':
          rule.action = String(value);
          break;
        case 'priority':
          rule.priority = Number(value) || 1;
          break;
        case 'enabled':
          rule.enabled = Boolean(value);
          break;
        case 'exceptions':
          rule.exceptions = this.parseBusinessRuleExceptions(pair.value as yaml.Node);
          break;
        case 'metadata':
          rule.metadata = this.parseMetadataObject(pair.value as yaml.Node);
          break;
      }
    }

    if (!rule.id || !rule.name || !rule.description || !rule.condition || !rule.action) {
      this.addError('Business rule missing required fields (id, name, description, condition, action)', line, column, 'INCOMPLETE_BUSINESS_RULE');
      return null;
    }

    return rule as BusinessRule;
  }

  private parseDataStructures(node: yaml.Node | null, line: number, column: number): DataStructure[] | undefined {
    if (!yaml.isSeq(node)) {
      this.addError('Data structures must be an array', line, column, 'INVALID_DATA_STRUCTURES_TYPE');
      return undefined;
    }

    const structures: DataStructure[] = [];

    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      if (!yaml.isMap(item)) {
        this.addError(`Data structure ${i} must be an object`, line, column, 'INVALID_DATA_STRUCTURE_TYPE');
        continue;
      }

      const structure = this.parseDataStructure(item as yaml.YAMLMap, line, column);
      if (structure) {
        structures.push(structure);
      }
    }

    return structures;
  }

  private parseDataStructure(node: yaml.YAMLMap, line: number, column: number): DataStructure | null {
    const structure: Partial<DataStructure> = {
      fields: [],
      constraints: [],
      relationships: [],
      indexes: []
    };

    for (const pair of node.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);
      const value = pair.value;

      switch (key) {
        case 'id':
          structure.id = String(yaml.isScalar(value) ? value.value : '');
          break;
        case 'name':
          structure.name = String(yaml.isScalar(value) ? value.value : '');
          break;
        case 'type':
          structure.type = String(yaml.isScalar(value) ? value.value : 'object') as any;
          break;
        case 'description':
          structure.description = String(yaml.isScalar(value) ? value.value : '');
          break;
        case 'fields':
          structure.fields = this.parseDataFields(value as yaml.Node) || [];
          break;
      }
    }

    if (!structure.id || !structure.name || !structure.description) {
      this.addError('Data structure missing required fields (id, name, description)', line, column, 'INCOMPLETE_DATA_STRUCTURE');
      return null;
    }

    return structure as DataStructure;
  }

  private parseAPIEndpoints(node: yaml.Node | null, line: number, column: number): APIEndpoint[] | undefined {
    if (!yaml.isSeq(node)) {
      this.addError('API endpoints must be an array', line, column, 'INVALID_API_ENDPOINTS_TYPE');
      return undefined;
    }

    return [];
  }

  private parseWorkflowSteps(node: yaml.Node | null, line: number, column: number): WorkflowStep[] | undefined {
    if (!yaml.isSeq(node)) {
      this.addError('Workflow steps must be an array', line, column, 'INVALID_WORKFLOW_STEPS_TYPE');
      return undefined;
    }

    return [];
  }

  private parseAIContext(node: yaml.Node | null, line: number, column: number): AIContext | undefined {
    if (!yaml.isMap(node)) {
      this.addError('AI context must be an object', line, column, 'INVALID_AI_CONTEXT_TYPE');
      return undefined;
    }

    const context: Partial<AIContext> = {};

    for (const pair of node.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);

      switch (key) {
        case 'modelHints':
        case 'model_hints':
          context.modelHints = this.parseStringArray(pair.value as yaml.Node);
          break;
        case 'examples':
          context.examples = [];
          break;
        case 'constraints':
          context.constraints = this.parseStringArray(pair.value as yaml.Node);
          break;
        case 'processingInstructions':
        case 'processing_instructions':
          context.processingInstructions = this.parseStringArray(pair.value as yaml.Node);
          break;
      }
    }

    return context as AIContext;
  }

  private parseGovernance(node: yaml.Node | null, line: number, column: number): GovernanceMetadata | undefined {
    if (!yaml.isMap(node)) {
      this.addError('Governance must be an object', line, column, 'INVALID_GOVERNANCE_TYPE');
      return undefined;
    }

    const governance: Partial<GovernanceMetadata> = {
      approvalStatus: 'draft',
      riskLevel: 'low',
      auditTrail: []
    };

    for (const pair of node.items) {
      if (!yaml.isScalar(pair.key)) continue;
      
      const key = String(pair.key.value);
      const value = yaml.isScalar(pair.value) ? pair.value.value : pair.value;

      switch (key) {
        case 'approvalStatus':
        case 'approval_status':
          governance.approvalStatus = String(value) as any;
          break;
        case 'riskLevel':
        case 'risk_level':
          governance.riskLevel = String(value) as any;
          break;
        case 'approvedBy':
        case 'approved_by':
          governance.approvedBy = value ? String(value) : undefined;
          break;
        case 'approvalDate':
        case 'approval_date':
          governance.approvalDate = value ? String(value) : undefined;
          break;
        case 'complianceFrameworks':
        case 'compliance_frameworks':
          governance.complianceFrameworks = this.parseStringArray(pair.value as yaml.Node);
          break;
      }
    }

    return governance as GovernanceMetadata;
  }

  private parseExtends(node: yaml.Node | null, line: number, column: number): string[] | undefined {
    return this.parseStringArray(node);
  }

  private parseImports(node: yaml.Node | null, line: number, column: number): ImportStatement[] | undefined {
    if (!yaml.isSeq(node)) {
      return undefined;
    }

    return [];
  }

  private parseExports(node: yaml.Node | null, line: number, column: number): ExportStatement[] | undefined {
    if (!yaml.isSeq(node)) {
      return undefined;
    }

    return [];
  }

  private parseStringArray(node: yaml.Node | null): string[] | undefined {
    if (!yaml.isSeq(node)) {
      return undefined;
    }

    const array: string[] = [];
    for (const item of node.items) {
      if (yaml.isScalar(item) && item.value !== null) {
        array.push(String(item.value));
      }
    }

    return array;
  }

  private parseBusinessRuleExceptions(node: yaml.Node | null): any[] {
    return [];
  }

  private parseMetadataObject(node: yaml.Node | null): Record<string, unknown> {
    return {};
  }

  private parseDataFields(node: yaml.Node | null): any[] {
    return [];
  }

  private validateBasicStructure(document: ESLDocument): void {
    const metadataErrors = validateIdentifier(document.metadata.id, 'metadata.id');
    this.errors.push(...metadataErrors);

    const descriptionErrors = validateDescription(document.metadata.description, 'metadata.description');
    this.warnings.push(...descriptionErrors);
  }

  private processYAMLErrors(yamlErrors: yaml.YAMLError[]): void {
    for (const error of yamlErrors) {
      const line = error.linePos?.[0]?.line || 0;
      const column = error.linePos?.[0]?.col || 0;
      this.addError(`YAML Error: ${error.message}`, line, column, 'YAML_ERROR');
    }
  }

  private processYAMLWarnings(yamlWarnings: yaml.YAMLWarning[]): void {
    for (const warning of yamlWarnings) {
      const line = warning.linePos?.[0]?.line || 0;
      const column = warning.linePos?.[0]?.col || 0;
      this.addWarning(`YAML Warning: ${warning.message}`, line, column, 'YAML_WARNING');
    }
  }

  private addError(message: string, line: number, column: number, code: string, suggestions?: string[]): void {
    if (this.errors.length >= this.options.maxErrors) {
      return;
    }

    this.errors.push({
      message,
      line,
      column,
      code,
      severity: 'error',
      suggestions
    });
  }

  private addWarning(message: string, line: number, column: number, code: string, suggestions?: string[]): void {
    if (!this.options.includeWarnings) {
      return;
    }

    this.warnings.push({
      message,
      line,
      column,
      code,
      severity: 'warning',
      suggestions
    });
  }

  private getLineNumber(position: number): number {
    return 1;
  }

  private getColumnNumber(position: number): number {
    return 1;
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.lineMap.clear();
  }

  private createResult(): ESLValidationResult {
    const isValid = this.errors.length === 0;
    return createValidationResult(isValid, this.errors, this.warnings);
  }
}