import {
  ESLDocument,
  ESLParseError,
  ESLValidationResult,
  BusinessRule,
  DataStructure,
  APIEndpoint,
  WorkflowStep,
  ProcessingContext,
  ValidationRule
} from '../core/types.js';
import {
  createValidationResult,
  validateIdentifier,
  validateDescription,
  validateFieldName,
  mergeValidationResults
} from '../core/utils.js';
import {
  SUPPORTED_DATA_TYPES,
  SUPPORTED_HTTP_METHODS,
  APPROVAL_STATUSES,
  RISK_LEVELS,
  STEP_TYPES,
  RESERVED_KEYWORDS
} from '../core/constants.js';
import { ValidationRuleEngine } from './rules.js';

export interface ValidationOptions {
  strictMode: boolean;
  validateReferences: boolean;
  validateBusinessLogic: boolean;
  validateAIContext: boolean;
  validateGovernance: boolean;
  maxErrors: number;
}

export class ESLValidator {
  private readonly options: ValidationOptions;
  private readonly ruleEngine: ValidationRuleEngine;
  private errors: ESLParseError[] = [];
  private warnings: ESLParseError[] = [];
  private documentRefs: Map<string, Set<string>> = new Map();

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = {
      strictMode: false,
      validateReferences: true,
      validateBusinessLogic: true,
      validateAIContext: true,
      validateGovernance: true,
      maxErrors: 100,
      ...options
    };
    this.ruleEngine = new ValidationRuleEngine();
  }

  async validateDocument(document: ESLDocument, context?: ProcessingContext): Promise<ESLValidationResult> {
    this.reset();

    try {
      this.validateMetadata(document);
      
      if (document.businessRules) {
        this.validateBusinessRules(document.businessRules);
      }
      
      if (document.dataStructures) {
        this.validateDataStructures(document.dataStructures);
      }
      
      if (document.apiEndpoints) {
        this.validateAPIEndpoints(document.apiEndpoints);
      }
      
      if (document.workflowSteps) {
        this.validateWorkflowSteps(document.workflowSteps);
      }
      
      if (document.aiContext && this.options.validateAIContext) {
        this.validateAIContext(document);
      }
      
      if (document.governance && this.options.validateGovernance) {
        this.validateGovernance(document);
      }
      
      if (this.options.validateReferences) {
        this.validateCrossReferences(document);
      }
      
      if (this.options.validateBusinessLogic) {
        this.validateBusinessLogicConsistency(document);
      }

      const isValid = this.errors.length === 0;
      return createValidationResult(isValid, this.errors, this.warnings, document);

    } catch (error) {
      this.addError(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        0,
        'VALIDATION_ERROR'
      );
      return createValidationResult(false, this.errors, this.warnings);
    }
  }

  private validateMetadata(document: ESLDocument): void {
    const metadata = document.metadata;
    
    if (!metadata) {
      this.addError('Document metadata is required', 0, 0, 'MISSING_METADATA');
      return;
    }

    const idErrors = validateIdentifier(metadata.id, 'metadata.id');
    this.errors.push(...idErrors);

    if (!metadata.title || metadata.title.trim().length === 0) {
      this.addError('Metadata title is required and cannot be empty', 0, 0, 'MISSING_TITLE');
    }

    if (!metadata.version || metadata.version.trim().length === 0) {
      this.addError('Metadata version is required and cannot be empty', 0, 0, 'MISSING_VERSION');
    } else if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      this.addWarning('Version should follow semantic versioning (e.g., 1.0.0)', 0, 0, 'INVALID_VERSION_FORMAT');
    }

    const descErrors = validateDescription(metadata.description, 'metadata.description');
    this.warnings.push(...descErrors);

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          this.addError('All tags must be non-empty strings', 0, 0, 'INVALID_TAG');
        }
      }
    }
  }

  private validateBusinessRules(rules: BusinessRule[]): void {
    const ruleIds = new Set<string>();

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const rulePrefix = `businessRules[${i}]`;

      const idErrors = validateIdentifier(rule.id, `${rulePrefix}.id`);
      this.errors.push(...idErrors.map(e => ({ ...e, message: `${rulePrefix}: ${e.message}` })));

      if (ruleIds.has(rule.id)) {
        this.addError(`Duplicate business rule ID: ${rule.id}`, 0, 0, 'DUPLICATE_BUSINESS_RULE_ID');
      } else {
        ruleIds.add(rule.id);
      }

      if (!rule.name || rule.name.trim().length === 0) {
        this.addError(`${rulePrefix}: Business rule name is required`, 0, 0, 'MISSING_BUSINESS_RULE_NAME');
      }

      if (!rule.description || rule.description.trim().length === 0) {
        this.addError(`${rulePrefix}: Business rule description is required`, 0, 0, 'MISSING_BUSINESS_RULE_DESCRIPTION');
      }

      if (!rule.condition || rule.condition.trim().length === 0) {
        this.addError(`${rulePrefix}: Business rule condition is required`, 0, 0, 'MISSING_BUSINESS_RULE_CONDITION');
      }

      if (!rule.action || rule.action.trim().length === 0) {
        this.addError(`${rulePrefix}: Business rule action is required`, 0, 0, 'MISSING_BUSINESS_RULE_ACTION');
      }

      if (rule.priority < 1 || rule.priority > 10) {
        this.addWarning(`${rulePrefix}: Business rule priority should be between 1 and 10`, 0, 0, 'INVALID_BUSINESS_RULE_PRIORITY');
      }

      if (rule.exceptions) {
        this.validateBusinessRuleExceptions(rule.exceptions, rulePrefix);
      }
    }

    this.documentRefs.set('businessRules', ruleIds);
  }

  private validateBusinessRuleExceptions(exceptions: any[], rulePrefix: string): void {
    for (let i = 0; i < exceptions.length; i++) {
      const exception = exceptions[i];
      const exceptionPrefix = `${rulePrefix}.exceptions[${i}]`;

      if (!exception.id || typeof exception.id !== 'string') {
        this.addError(`${exceptionPrefix}: Exception ID is required`, 0, 0, 'MISSING_EXCEPTION_ID');
      }

      if (!exception.condition || typeof exception.condition !== 'string') {
        this.addError(`${exceptionPrefix}: Exception condition is required`, 0, 0, 'MISSING_EXCEPTION_CONDITION');
      }

      if (!exception.action || typeof exception.action !== 'string') {
        this.addError(`${exceptionPrefix}: Exception action is required`, 0, 0, 'MISSING_EXCEPTION_ACTION');
      }
    }
  }

  private validateDataStructures(structures: DataStructure[]): void {
    const structureIds = new Set<string>();

    for (let i = 0; i < structures.length; i++) {
      const structure = structures[i];
      const structPrefix = `dataStructures[${i}]`;

      const idErrors = validateIdentifier(structure.id, `${structPrefix}.id`);
      this.errors.push(...idErrors.map(e => ({ ...e, message: `${structPrefix}: ${e.message}` })));

      if (structureIds.has(structure.id)) {
        this.addError(`Duplicate data structure ID: ${structure.id}`, 0, 0, 'DUPLICATE_DATA_STRUCTURE_ID');
      } else {
        structureIds.add(structure.id);
      }

      const nameErrors = validateFieldName(structure.name, `${structPrefix}.name`);
      this.errors.push(...nameErrors.map(e => ({ ...e, message: `${structPrefix}: ${e.message}` })));

      if (!SUPPORTED_DATA_TYPES.includes(structure.type as any)) {
        this.addError(`${structPrefix}: Invalid data type '${structure.type}'. Must be one of: ${SUPPORTED_DATA_TYPES.join(', ')}`, 0, 0, 'INVALID_DATA_TYPE');
      }

      if (!structure.description || structure.description.trim().length === 0) {
        this.addError(`${structPrefix}: Data structure description is required`, 0, 0, 'MISSING_DATA_STRUCTURE_DESCRIPTION');
      }

      if (structure.fields) {
        this.validateDataFields(structure.fields, structPrefix);
      }
    }

    this.documentRefs.set('dataStructures', structureIds);
  }

  private validateDataFields(fields: any[], structPrefix: string): void {
    const fieldNames = new Set<string>();

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldPrefix = `${structPrefix}.fields[${i}]`;

      if (!field.name || typeof field.name !== 'string') {
        this.addError(`${fieldPrefix}: Field name is required`, 0, 0, 'MISSING_FIELD_NAME');
        continue;
      }

      const nameErrors = validateFieldName(field.name, `${fieldPrefix}.name`);
      this.errors.push(...nameErrors.map(e => ({ ...e, message: `${fieldPrefix}: ${e.message}` })));

      if (fieldNames.has(field.name)) {
        this.addError(`${fieldPrefix}: Duplicate field name '${field.name}'`, 0, 0, 'DUPLICATE_FIELD_NAME');
      } else {
        fieldNames.add(field.name);
      }

      if (!field.type || !SUPPORTED_DATA_TYPES.includes(field.type)) {
        this.addError(`${fieldPrefix}: Invalid field type '${field.type}'. Must be one of: ${SUPPORTED_DATA_TYPES.join(', ')}`, 0, 0, 'INVALID_FIELD_TYPE');
      }

      if (typeof field.required !== 'boolean') {
        this.addError(`${fieldPrefix}: Field 'required' must be a boolean`, 0, 0, 'INVALID_FIELD_REQUIRED');
      }

      if (field.validation) {
        this.validateFieldValidationRules(field.validation, fieldPrefix);
      }
    }
  }

  private validateFieldValidationRules(rules: ValidationRule[], fieldPrefix: string): void {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const rulePrefix = `${fieldPrefix}.validation[${i}]`;

      if (!rule.type || !['pattern', 'range', 'length', 'custom'].includes(rule.type)) {
        this.addError(`${rulePrefix}: Invalid validation rule type '${rule.type}'`, 0, 0, 'INVALID_VALIDATION_RULE_TYPE');
      }

      if (rule.type === 'pattern' && (!rule.pattern || typeof rule.pattern !== 'string')) {
        this.addError(`${rulePrefix}: Pattern validation rule requires 'pattern' string`, 0, 0, 'MISSING_VALIDATION_PATTERN');
      }

      if (rule.type === 'range' && (typeof rule.min !== 'number' || typeof rule.max !== 'number')) {
        this.addError(`${rulePrefix}: Range validation rule requires 'min' and 'max' numbers`, 0, 0, 'MISSING_VALIDATION_RANGE');
      }

      if (rule.type === 'length' && (typeof rule.min !== 'number' && typeof rule.max !== 'number')) {
        this.addError(`${rulePrefix}: Length validation rule requires 'min' or 'max' number`, 0, 0, 'MISSING_VALIDATION_LENGTH');
      }
    }
  }

  private validateAPIEndpoints(endpoints: APIEndpoint[]): void {
    const endpointIds = new Set<string>();
    const paths = new Map<string, string[]>();

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      const endpointPrefix = `apiEndpoints[${i}]`;

      const idErrors = validateIdentifier(endpoint.id, `${endpointPrefix}.id`);
      this.errors.push(...idErrors.map(e => ({ ...e, message: `${endpointPrefix}: ${e.message}` })));

      if (endpointIds.has(endpoint.id)) {
        this.addError(`Duplicate API endpoint ID: ${endpoint.id}`, 0, 0, 'DUPLICATE_API_ENDPOINT_ID');
      } else {
        endpointIds.add(endpoint.id);
      }

      if (!endpoint.path || !endpoint.path.startsWith('/')) {
        this.addError(`${endpointPrefix}: API endpoint path must start with '/'`, 0, 0, 'INVALID_API_PATH');
      }

      if (!SUPPORTED_HTTP_METHODS.includes(endpoint.method)) {
        this.addError(`${endpointPrefix}: Invalid HTTP method '${endpoint.method}'. Must be one of: ${SUPPORTED_HTTP_METHODS.join(', ')}`, 0, 0, 'INVALID_HTTP_METHOD');
      }

      const pathKey = `${endpoint.method} ${endpoint.path}`;
      if (!paths.has(endpoint.path)) {
        paths.set(endpoint.path, []);
      }
      const pathMethods = paths.get(endpoint.path)!;
      if (pathMethods.includes(endpoint.method)) {
        this.addError(`${endpointPrefix}: Duplicate endpoint '${pathKey}'`, 0, 0, 'DUPLICATE_API_ENDPOINT');
      } else {
        pathMethods.push(endpoint.method);
      }

      if (!endpoint.description || endpoint.description.trim().length === 0) {
        this.addError(`${endpointPrefix}: API endpoint description is required`, 0, 0, 'MISSING_API_ENDPOINT_DESCRIPTION');
      }

      if (!endpoint.responses || endpoint.responses.length === 0) {
        this.addError(`${endpointPrefix}: API endpoint must have at least one response`, 0, 0, 'MISSING_API_RESPONSES');
      }
    }

    this.documentRefs.set('apiEndpoints', endpointIds);
  }

  private validateWorkflowSteps(steps: WorkflowStep[]): void {
    const stepIds = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepPrefix = `workflowSteps[${i}]`;

      const idErrors = validateIdentifier(step.id, `${stepPrefix}.id`);
      this.errors.push(...idErrors.map(e => ({ ...e, message: `${stepPrefix}: ${e.message}` })));

      if (stepIds.has(step.id)) {
        this.addError(`Duplicate workflow step ID: ${step.id}`, 0, 0, 'DUPLICATE_WORKFLOW_STEP_ID');
      } else {
        stepIds.add(step.id);
      }

      if (!STEP_TYPES.includes(step.type as any)) {
        this.addError(`${stepPrefix}: Invalid step type '${step.type}'. Must be one of: ${STEP_TYPES.join(', ')}`, 0, 0, 'INVALID_STEP_TYPE');
      }

      if (!step.description || step.description.trim().length === 0) {
        this.addError(`${stepPrefix}: Workflow step description is required`, 0, 0, 'MISSING_WORKFLOW_STEP_DESCRIPTION');
      }

      if (!step.action || step.action.trim().length === 0) {
        this.addError(`${stepPrefix}: Workflow step action is required`, 0, 0, 'MISSING_WORKFLOW_STEP_ACTION');
      }

      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            this.addError(`${stepPrefix}: Workflow step dependency '${dep}' not found`, 0, 0, 'MISSING_WORKFLOW_DEPENDENCY');
          }
        }
      }
    }

    this.documentRefs.set('workflowSteps', stepIds);
  }

  private validateAIContext(document: ESLDocument): void {
    const aiContext = document.aiContext;
    if (!aiContext) return;

    if (aiContext.tokenOptimization) {
      const tokenOpt = aiContext.tokenOptimization;
      
      if (tokenOpt.maxTokens && (tokenOpt.maxTokens <= 0 || tokenOpt.maxTokens > 100000)) {
        this.addWarning('AI context maxTokens should be between 1 and 100000', 0, 0, 'INVALID_MAX_TOKENS');
      }

      if (tokenOpt.compressionLevel && !['none', 'low', 'medium', 'high'].includes(tokenOpt.compressionLevel)) {
        this.addError('AI context compressionLevel must be one of: none, low, medium, high', 0, 0, 'INVALID_COMPRESSION_LEVEL');
      }
    }

    if (aiContext.examples) {
      for (let i = 0; i < aiContext.examples.length; i++) {
        const example = aiContext.examples[i];
        const examplePrefix = `aiContext.examples[${i}]`;

        if (!example.id || typeof example.id !== 'string') {
          this.addError(`${examplePrefix}: AI example ID is required`, 0, 0, 'MISSING_AI_EXAMPLE_ID');
        }

        if (!example.description || typeof example.description !== 'string') {
          this.addError(`${examplePrefix}: AI example description is required`, 0, 0, 'MISSING_AI_EXAMPLE_DESCRIPTION');
        }
      }
    }
  }

  private validateGovernance(document: ESLDocument): void {
    const governance = document.governance;
    if (!governance) return;

    if (!APPROVAL_STATUSES.includes(governance.approvalStatus as any)) {
      this.addError(`Invalid approval status '${governance.approvalStatus}'. Must be one of: ${APPROVAL_STATUSES.join(', ')}`, 0, 0, 'INVALID_APPROVAL_STATUS');
    }

    if (!RISK_LEVELS.includes(governance.riskLevel as any)) {
      this.addError(`Invalid risk level '${governance.riskLevel}'. Must be one of: ${RISK_LEVELS.join(', ')}`, 0, 0, 'INVALID_RISK_LEVEL');
    }

    if (governance.approvalStatus === 'approved' && !governance.approvedBy) {
      this.addError('Approved documents must specify approvedBy', 0, 0, 'MISSING_APPROVER');
    }

    if (governance.approvalStatus === 'approved' && !governance.approvalDate) {
      this.addError('Approved documents must specify approvalDate', 0, 0, 'MISSING_APPROVAL_DATE');
    }
  }

  private validateCrossReferences(document: ESLDocument): void {
    const allIds = new Set<string>();
    
    this.documentRefs.forEach((ids) => {
      ids.forEach(id => allIds.add(id));
    });

    this.validateWorkflowStepDependencies(document, allIds);
    this.validateDataStructureReferences(document, allIds);
  }

  private validateWorkflowStepDependencies(document: ESLDocument, allIds: Set<string>): void {
    if (!document.workflowSteps) return;

    const stepIds = this.documentRefs.get('workflowSteps') || new Set();

    for (let i = 0; i < document.workflowSteps.length; i++) {
      const step = document.workflowSteps[i];
      const stepPrefix = `workflowSteps[${i}]`;

      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            this.addError(`${stepPrefix}: Referenced step '${dep}' not found`, 0, 0, 'INVALID_STEP_REFERENCE');
          }
        }
      }
    }
  }

  private validateDataStructureReferences(document: ESLDocument, allIds: Set<string>): void {
    if (!document.dataStructures) return;

    const structureIds = this.documentRefs.get('dataStructures') || new Set();

    for (const structure of document.dataStructures) {
      if (structure.fields) {
        for (const field of structure.fields) {
          if (field.type === 'reference' && field.referenceTo) {
            if (!structureIds.has(field.referenceTo)) {
              this.addError(`Data field references unknown structure '${field.referenceTo}'`, 0, 0, 'INVALID_STRUCTURE_REFERENCE');
            }
          }
        }
      }
    }
  }

  private validateBusinessLogicConsistency(document: ESLDocument): void {
    if (!document.businessRules || !document.dataStructures) return;

    const entityNames = new Set(document.dataStructures.map(ds => ds.name.toLowerCase()));

    for (const rule of document.businessRules) {
      const ruleText = `${rule.condition} ${rule.action}`.toLowerCase();
      
      let referencesEntity = false;
      for (const entityName of entityNames) {
        if (ruleText.includes(entityName)) {
          referencesEntity = true;
          break;
        }
      }

      if (!referencesEntity && this.options.strictMode) {
        this.addWarning(`Business rule '${rule.name}' does not reference any defined data structures`, 0, 0, 'DISCONNECTED_BUSINESS_RULE');
      }
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
    this.warnings.push({
      message,
      line,
      column,
      code,
      severity: 'warning',
      suggestions
    });
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.documentRefs.clear();
  }
}