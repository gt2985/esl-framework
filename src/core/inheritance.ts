import {
  ESLDocument,
  ESLParseError,
  ESLValidationResult,
  BusinessRule,
  DataStructure,
  APIEndpoint,
  WorkflowStep,
  AIContext,
  GovernanceMetadata,
  ProcessingContext,
  ImportStatement
} from './types.js';
import {
  ESLError,
  readFile,
  parseYAML,
  createValidationResult,
  resolveImportPath,
  normalizeFilePath
} from './utils.js';

export interface InheritanceNode {
  document: ESLDocument;
  filePath: string;
  children: InheritanceNode[];
  processed: boolean;
}

export interface InheritanceResolutionOptions {
  maxDepth: number;
  allowCircular: boolean;
  mergeStrategy: 'override' | 'merge' | 'append';
  validateInheritance: boolean;
}

export class InheritanceResolver {
  private readonly options: InheritanceResolutionOptions;
  private loadedDocuments: Map<string, ESLDocument> = new Map();
  private resolutionStack: Set<string> = new Set();
  private errors: ESLParseError[] = [];

  constructor(options: Partial<InheritanceResolutionOptions> = {}) {
    this.options = {
      maxDepth: 10,
      allowCircular: false,
      mergeStrategy: 'merge',
      validateInheritance: true,
      ...options
    };
  }

  async resolveInheritance(
    document: ESLDocument, 
    context: ProcessingContext
  ): Promise<ESLValidationResult> {
    this.reset();

    try {
      const resolvedDocument = await this.resolveDocumentInheritance(
        document, 
        context.basePath, 
        context
      );

      if (this.options.validateInheritance) {
        this.validateInheritanceConsistency(resolvedDocument);
      }

      const isValid = this.errors.length === 0;
      return createValidationResult(isValid, this.errors, [], resolvedDocument);

    } catch (error) {
      this.addError(
        `Inheritance resolution error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        0,
        'INHERITANCE_RESOLUTION_ERROR'
      );
      return createValidationResult(false, this.errors);
    }
  }

  private async resolveDocumentInheritance(
    document: ESLDocument,
    basePath: string,
    context: ProcessingContext,
    depth: number = 0
  ): Promise<ESLDocument> {
    if (depth > this.options.maxDepth) {
      this.addError(
        `Maximum inheritance depth (${this.options.maxDepth}) exceeded`,
        0,
        0,
        'MAX_INHERITANCE_DEPTH'
      );
      return document;
    }

    if (!document.extends || document.extends.length === 0) {
      return document;
    }

    let resolvedDocument = { ...document };

    for (const parentPath of document.extends) {
      const fullPath = resolveImportPath(parentPath, basePath);
      const normalizedPath = normalizeFilePath(fullPath);

      if (this.resolutionStack.has(normalizedPath)) {
        if (!this.options.allowCircular) {
          this.addError(
            `Circular inheritance detected: ${Array.from(this.resolutionStack).join(' -> ')} -> ${normalizedPath}`,
            0,
            0,
            'CIRCULAR_INHERITANCE'
          );
          continue;
        }
      }

      this.resolutionStack.add(normalizedPath);

      try {
        const parentDocument = await this.loadParentDocument(normalizedPath, context);
        const resolvedParent = await this.resolveDocumentInheritance(
          parentDocument,
          normalizedPath,
          context,
          depth + 1
        );

        resolvedDocument = this.mergeDocuments(resolvedParent, resolvedDocument);

      } catch (error) {
        this.addError(
          `Failed to load parent document '${parentPath}': ${error instanceof Error ? error.message : String(error)}`,
          0,
          0,
          'PARENT_LOAD_ERROR'
        );
      } finally {
        this.resolutionStack.delete(normalizedPath);
      }
    }

    return resolvedDocument;
  }

  private async loadParentDocument(filePath: string, context: ProcessingContext): Promise<ESLDocument> {
    if (this.loadedDocuments.has(filePath)) {
      return this.loadedDocuments.get(filePath)!;
    }

    if (context.importCache.has(filePath)) {
      const cached = context.importCache.get(filePath)!;
      this.loadedDocuments.set(filePath, cached);
      return cached;
    }

    try {
      const content = await readFile(filePath);
      const data = parseYAML(content);

      if (!this.isValidESLDocument(data)) {
        throw new ESLError(
          `Parent document is not a valid ESL document: ${filePath}`,
          'INVALID_PARENT_DOCUMENT'
        );
      }

      const document = data as ESLDocument;
      this.loadedDocuments.set(filePath, document);
      context.importCache.set(filePath, document);

      return document;

    } catch (error) {
      throw new ESLError(
        `Failed to load parent document: ${error instanceof Error ? error.message : String(error)}`,
        'PARENT_LOAD_FAILED'
      );
    }
  }

  private mergeDocuments(parent: ESLDocument, child: ESLDocument): ESLDocument {
    const merged: ESLDocument = {
      metadata: this.mergeMetadata(parent.metadata, child.metadata),
      businessRules: this.mergeBusinessRules(parent.businessRules, child.businessRules),
      dataStructures: this.mergeDataStructures(parent.dataStructures, child.dataStructures),
      apiEndpoints: this.mergeAPIEndpoints(parent.apiEndpoints, child.apiEndpoints),
      workflowSteps: this.mergeWorkflowSteps(parent.workflowSteps, child.workflowSteps),
      aiContext: this.mergeAIContext(parent.aiContext, child.aiContext),
      governance: this.mergeGovernance(parent.governance, child.governance),
      extends: child.extends,
      imports: this.mergeImports(parent.imports, child.imports),
      exports: this.mergeExports(parent.exports, child.exports)
    };

    return merged;
  }

  private mergeMetadata(parent: any, child: any): any {
    return {
      ...parent,
      ...child,
      tags: this.mergeArrays(parent?.tags, child?.tags)
    };
  }

  private mergeBusinessRules(
    parent: BusinessRule[] | undefined, 
    child: BusinessRule[] | undefined
  ): BusinessRule[] | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    const parentMap = new Map(parent.map(rule => [rule.id, rule]));
    const merged: BusinessRule[] = [...parent];

    for (const childRule of child) {
      const existingIndex = merged.findIndex(rule => rule.id === childRule.id);
      
      if (existingIndex >= 0) {
        switch (this.options.mergeStrategy) {
          case 'override':
            merged[existingIndex] = childRule;
            break;
          case 'merge':
            const existingRule = merged[existingIndex];
            if (existingRule) {
              merged[existingIndex] = this.mergeBusinessRule(existingRule, childRule);
            }
            break;
          case 'append':
            merged.push(childRule);
            break;
        }
      } else {
        merged.push(childRule);
      }
    }

    return merged;
  }

  private mergeBusinessRule(parent: BusinessRule, child: BusinessRule): BusinessRule {
    return {
      ...parent,
      ...child,
      exceptions: this.mergeArrays(parent.exceptions, child.exceptions),
      metadata: { ...parent.metadata, ...child.metadata }
    };
  }

  private mergeDataStructures(
    parent: DataStructure[] | undefined,
    child: DataStructure[] | undefined
  ): DataStructure[] | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    const merged: DataStructure[] = [...parent];

    for (const childStructure of child) {
      const existingIndex = merged.findIndex(structure => structure.id === childStructure.id);
      
      if (existingIndex >= 0) {
        switch (this.options.mergeStrategy) {
          case 'override':
            merged[existingIndex] = childStructure;
            break;
          case 'merge':
            const existingStructure = merged[existingIndex];
            if (existingStructure) {
              merged[existingIndex] = this.mergeDataStructure(existingStructure, childStructure);
            }
            break;
          case 'append':
            merged.push(childStructure);
            break;
        }
      } else {
        merged.push(childStructure);
      }
    }

    return merged;
  }

  private mergeDataStructure(parent: DataStructure, child: DataStructure): DataStructure {
    return {
      ...parent,
      ...child,
      fields: this.mergeArrays(parent.fields, child.fields) || [],
      constraints: this.mergeArrays(parent.constraints, child.constraints) || [],
      relationships: this.mergeArrays(parent.relationships, child.relationships) || [],
      indexes: this.mergeArrays(parent.indexes, child.indexes) || []
    };
  }

  private mergeAPIEndpoints(
    parent: APIEndpoint[] | undefined,
    child: APIEndpoint[] | undefined
  ): APIEndpoint[] | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    const merged: APIEndpoint[] = [...parent];

    for (const childEndpoint of child) {
      const existingIndex = merged.findIndex(endpoint => endpoint.id === childEndpoint.id);
      
      if (existingIndex >= 0) {
        switch (this.options.mergeStrategy) {
          case 'override':
            merged[existingIndex] = childEndpoint;
            break;
          case 'merge':
            const existingEndpoint = merged[existingIndex];
            if (existingEndpoint) {
              merged[existingIndex] = this.mergeAPIEndpoint(existingEndpoint, childEndpoint);
            }
            break;
          case 'append':
            merged.push(childEndpoint);
            break;
        }
      } else {
        merged.push(childEndpoint);
      }
    }

    return merged;
  }

  private mergeAPIEndpoint(parent: APIEndpoint, child: APIEndpoint): APIEndpoint {
    return {
      ...parent,
      ...child,
      parameters: this.mergeArrays(parent.parameters, child.parameters) || [],
      responses: this.mergeArrays(parent.responses, child.responses) || [],
      authentication: this.mergeArrays(parent.authentication, child.authentication) || [],
      examples: this.mergeArrays(parent.examples, child.examples) || []
    };
  }

  private mergeWorkflowSteps(
    parent: WorkflowStep[] | undefined,
    child: WorkflowStep[] | undefined
  ): WorkflowStep[] | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    const merged: WorkflowStep[] = [...parent];

    for (const childStep of child) {
      const existingIndex = merged.findIndex(step => step.id === childStep.id);
      
      if (existingIndex >= 0) {
        switch (this.options.mergeStrategy) {
          case 'override':
            merged[existingIndex] = childStep;
            break;
          case 'merge':
            const existingStep = merged[existingIndex];
            if (existingStep) {
              merged[existingIndex] = this.mergeWorkflowStep(existingStep, childStep);
            }
            break;
          case 'append':
            merged.push(childStep);
            break;
        }
      } else {
        merged.push(childStep);
      }
    }

    return merged;
  }

  private mergeWorkflowStep(parent: WorkflowStep, child: WorkflowStep): WorkflowStep {
    return {
      ...parent,
      ...child,
      dependencies: this.mergeArrays(parent.dependencies, child.dependencies) || undefined,
      outputs: { ...parent.outputs, ...child.outputs }
    };
  }

  private mergeAIContext(
    parent: AIContext | undefined,
    child: AIContext | undefined
  ): AIContext | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    return {
      ...parent,
      ...child,
      modelHints: this.mergeArrays(parent.modelHints, child.modelHints) || undefined,
      examples: this.mergeArrays(parent.examples, child.examples) || undefined,
      constraints: this.mergeArrays(parent.constraints, child.constraints) || undefined,
      processingInstructions: this.mergeArrays(parent.processingInstructions, child.processingInstructions) || undefined,
      tokenOptimization: child.tokenOptimization || parent.tokenOptimization
    };
  }

  private mergeGovernance(
    parent: GovernanceMetadata | undefined,
    child: GovernanceMetadata | undefined
  ): GovernanceMetadata | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    return {
      ...parent,
      ...child,
      complianceFrameworks: this.mergeArrays(parent.complianceFrameworks, child.complianceFrameworks) || undefined,
      auditTrail: this.mergeArrays(parent.auditTrail, child.auditTrail) || undefined
    };
  }

  private mergeImports(
    parent: ImportStatement[] | undefined,
    child: ImportStatement[] | undefined
  ): ImportStatement[] | undefined {
    return this.mergeArrays(parent, child);
  }

  private mergeExports(
    parent: any[] | undefined,
    child: any[] | undefined
  ): any[] | undefined {
    return this.mergeArrays(parent, child);
  }

  private mergeArrays<T>(parent: T[] | undefined, child: T[] | undefined): T[] | undefined {
    if (!parent && !child) return undefined;
    if (!parent) return child;
    if (!child) return parent;

    return [...parent, ...child];
  }

  private validateInheritanceConsistency(document: ESLDocument): void {
    this.validateBusinessRuleInheritance(document);
    this.validateDataStructureInheritance(document);
    this.validateAPIEndpointInheritance(document);
    this.validateWorkflowStepInheritance(document);
  }

  private validateBusinessRuleInheritance(document: ESLDocument): void {
    if (!document.businessRules) return;

    const ruleIds = new Set<string>();
    for (const rule of document.businessRules) {
      if (ruleIds.has(rule.id)) {
        this.addError(
          `Duplicate business rule ID after inheritance resolution: ${rule.id}`,
          0,
          0,
          'DUPLICATE_INHERITED_RULE_ID'
        );
      }
      ruleIds.add(rule.id);
    }
  }

  private validateDataStructureInheritance(document: ESLDocument): void {
    if (!document.dataStructures) return;

    const structureIds = new Set<string>();
    for (const structure of document.dataStructures) {
      if (structureIds.has(structure.id)) {
        this.addError(
          `Duplicate data structure ID after inheritance resolution: ${structure.id}`,
          0,
          0,
          'DUPLICATE_INHERITED_STRUCTURE_ID'
        );
      }
      structureIds.add(structure.id);
    }
  }

  private validateAPIEndpointInheritance(document: ESLDocument): void {
    if (!document.apiEndpoints) return;

    const endpointPaths = new Map<string, string[]>();
    
    for (const endpoint of document.apiEndpoints) {
      const path = endpoint.path;
      if (!endpointPaths.has(path)) {
        endpointPaths.set(path, []);
      }
      
      const methods = endpointPaths.get(path)!;
      if (methods.includes(endpoint.method)) {
        this.addError(
          `Duplicate API endpoint after inheritance resolution: ${endpoint.method} ${path}`,
          0,
          0,
          'DUPLICATE_INHERITED_ENDPOINT'
        );
      } else {
        methods.push(endpoint.method);
      }
    }
  }

  private validateWorkflowStepInheritance(document: ESLDocument): void {
    if (!document.workflowSteps) return;

    const stepIds = new Set<string>();
    for (const step of document.workflowSteps) {
      if (stepIds.has(step.id)) {
        this.addError(
          `Duplicate workflow step ID after inheritance resolution: ${step.id}`,
          0,
          0,
          'DUPLICATE_INHERITED_STEP_ID'
        );
      }
      stepIds.add(step.id);

      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            this.addError(
              `Workflow step '${step.id}' depends on missing step '${dep}' after inheritance`,
              0,
              0,
              'MISSING_INHERITED_DEPENDENCY'
            );
          }
        }
      }
    }
  }

  private isValidESLDocument(data: unknown): data is ESLDocument {
    return (
      typeof data === 'object' &&
      data !== null &&
      'metadata' in data &&
      typeof (data as any).metadata === 'object' &&
      (data as any).metadata !== null
    );
  }

  private addError(message: string, line: number, column: number, code: string): void {
    this.errors.push({
      message,
      line,
      column,
      code,
      severity: 'error'
    });
  }

  private reset(): void {
    this.errors = [];
    this.loadedDocuments.clear();
    this.resolutionStack.clear();
  }
}