import {
  ESLDocument,
  ESLParseError,
  ESLValidationResult,
  BusinessRule,
  DataStructure,
  APIEndpoint,
  WorkflowStep,
  ProcessingContext
} from '../core/types.js';
import { createValidationResult } from '../core/utils.js';

export interface SemanticAnalysisOptions {
  analyzeBusinessAlignment: boolean;
  analyzeTechnicalConsistency: boolean;
  analyzeAIOptimization: boolean;
  analyzeGovernanceCompliance: boolean;
  strictMode: boolean;
}

export interface SemanticIssue {
  type: 'alignment' | 'consistency' | 'optimization' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestions: string[];
  affectedElements: string[];
}

export class SemanticAnalyzer {
  private readonly options: SemanticAnalysisOptions;
  private issues: SemanticIssue[] = [];
  private errors: ESLParseError[] = [];
  private warnings: ESLParseError[] = [];

  constructor(options: Partial<SemanticAnalysisOptions> = {}) {
    this.options = {
      analyzeBusinessAlignment: true,
      analyzeTechnicalConsistency: true,
      analyzeAIOptimization: true,
      analyzeGovernanceCompliance: true,
      strictMode: false,
      ...options
    };
  }

  async analyzeDocument(
    document: ESLDocument,
    context?: ProcessingContext
  ): Promise<ESLValidationResult> {
    this.reset();

    try {
      if (this.options.analyzeBusinessAlignment) {
        this.analyzeBusinessTechnicalAlignment(document);
      }

      if (this.options.analyzeTechnicalConsistency) {
        this.analyzeTechnicalConsistency(document);
      }

      if (this.options.analyzeAIOptimization) {
        this.analyzeAIOptimization(document);
      }

      if (this.options.analyzeGovernanceCompliance) {
        this.analyzeGovernanceCompliance(document);
      }

      this.convertIssuesToErrors();

      const isValid = this.errors.length === 0;
      return createValidationResult(isValid, this.errors, this.warnings, document);

    } catch (error) {
      this.addError(
        `Semantic analysis error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        0,
        'SEMANTIC_ANALYSIS_ERROR'
      );
      return createValidationResult(false, this.errors, this.warnings);
    }
  }

  private analyzeBusinessTechnicalAlignment(document: ESLDocument): void {
    this.analyzeBusinessRuleImplementation(document);
    this.analyzeDataModelBusinessAlignment(document);
    this.analyzeAPIBusinessAlignment(document);
    this.analyzeWorkflowBusinessAlignment(document);
  }

  private analyzeBusinessRuleImplementation(document: ESLDocument): void {
    if (!document.businessRules) return;

    const dataEntities = new Set(
      (document.dataStructures || []).map(ds => ds.name.toLowerCase())
    );
    const apiOperations = new Set(
      (document.apiEndpoints || []).map(ep => `${ep.method.toLowerCase()}_${ep.path.split('/').pop()}`)
    );

    for (const rule of document.businessRules) {
      const ruleText = `${rule.condition} ${rule.action}`.toLowerCase();
      
      let hasDataReference = false;
      let hasAPIReference = false;

      for (const entity of dataEntities) {
        if (ruleText.includes(entity)) {
          hasDataReference = true;
          break;
        }
      }

      for (const operation of apiOperations) {
        if (ruleText.includes(operation) || ruleText.includes(operation.split('_')[1])) {
          hasAPIReference = true;
          break;
        }
      }

      if (!hasDataReference && !hasAPIReference) {
        this.addIssue({
          type: 'alignment',
          severity: 'warning',
          message: `Business rule '${rule.name}' lacks clear technical implementation mapping`,
          suggestions: [
            'Reference specific data structures in the rule condition or action',
            'Include API endpoint names that implement this rule',
            'Add technical implementation hints in metadata'
          ],
          affectedElements: [`businessRule:${rule.id}`]
        });
      }

      if (rule.metadata && !rule.metadata.ai_hint) {
        this.addIssue({
          type: 'optimization',
          severity: 'info',
          message: `Business rule '${rule.name}' could benefit from AI implementation hints`,
          suggestions: [
            'Add @implementation hints for AI code generation',
            'Include specific technical patterns to use',
            'Reference frameworks or libraries for implementation'
          ],
          affectedElements: [`businessRule:${rule.id}`]
        });
      }
    }
  }

  private analyzeDataModelBusinessAlignment(document: ESLDocument): void {
    if (!document.dataStructures || !document.businessRules) return;

    const businessTerms = new Set<string>();
    for (const rule of document.businessRules) {
      const words = `${rule.name} ${rule.description} ${rule.condition} ${rule.action}`
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3);
      words.forEach(word => businessTerms.add(word));
    }

    for (const structure of document.dataStructures) {
      const structureName = structure.name.toLowerCase();
      
      let hasBusinessAlignment = false;
      for (const term of businessTerms) {
        if (structureName.includes(term) || term.includes(structureName)) {
          hasBusinessAlignment = true;
          break;
        }
      }

      if (!hasBusinessAlignment && this.options.strictMode) {
        this.addIssue({
          type: 'alignment',
          severity: 'warning',
          message: `Data structure '${structure.name}' does not clearly align with business terminology`,
          suggestions: [
            'Rename to match business domain language',
            'Add business context in description',
            'Link to relevant business rules'
          ],
          affectedElements: [`dataStructure:${structure.id}`]
        });
      }

      if (structure.fields) {
        for (const field of structure.fields) {
          if (field.name.includes('id') && !field.description) {
            this.addIssue({
              type: 'alignment',
              severity: 'info',
              message: `ID field '${field.name}' in '${structure.name}' should explain its business purpose`,
              suggestions: [
                'Add description explaining what this ID represents',
                'Clarify relationship to other entities',
                'Document ID generation strategy'
              ],
              affectedElements: [`dataStructure:${structure.id}`, `field:${field.name}`]
            });
          }
        }
      }
    }
  }

  private analyzeAPIBusinessAlignment(document: ESLDocument): void {
    if (!document.apiEndpoints || !document.businessRules) return;

    const businessActions = new Set<string>();
    for (const rule of document.businessRules) {
      const actionWords = rule.action.toLowerCase().split(/\s+/);
      actionWords.forEach(word => {
        if (['create', 'update', 'delete', 'get', 'list', 'approve', 'reject', 'validate'].includes(word)) {
          businessActions.add(word);
        }
      });
    }

    for (const endpoint of document.apiEndpoints) {
      const endpointName = endpoint.name.toLowerCase();
      const path = endpoint.path.toLowerCase();
      
      let alignsWithBusinessAction = false;
      for (const action of businessActions) {
        if (endpointName.includes(action) || path.includes(action)) {
          alignsWithBusinessAction = true;
          break;
        }
      }

      if (!alignsWithBusinessAction) {
        this.addIssue({
          type: 'alignment',
          severity: 'info',
          message: `API endpoint '${endpoint.name}' may not directly support defined business actions`,
          suggestions: [
            'Ensure endpoint supports business rule requirements',
            'Add business context to endpoint description',
            'Link endpoint to specific business rules'
          ],
          affectedElements: [`apiEndpoint:${endpoint.id}`]
        });
      }

      if (endpoint.method === 'POST' && !path.includes('create') && !path.includes('add')) {
        this.addIssue({
          type: 'consistency',
          severity: 'warning',
          message: `POST endpoint '${endpoint.path}' should use clear creation semantics`,
          suggestions: [
            'Use paths like /create or /add for POST operations',
            'Ensure POST operations align with business creation rules',
            'Document the business entity being created'
          ],
          affectedElements: [`apiEndpoint:${endpoint.id}`]
        });
      }
    }
  }

  private analyzeWorkflowBusinessAlignment(document: ESLDocument): void {
    if (!document.workflowSteps || !document.businessRules) return;

    const businessProcesses = new Map<string, BusinessRule[]>();
    for (const rule of document.businessRules) {
      const processWords = rule.name.toLowerCase().split(/\s+/);
      for (const word of processWords) {
        if (!businessProcesses.has(word)) {
          businessProcesses.set(word, []);
        }
        businessProcesses.get(word)!.push(rule);
      }
    }

    for (const step of document.workflowSteps) {
      const stepName = step.name.toLowerCase();
      
      let relatedBusinessRules = 0;
      for (const [process, rules] of businessProcesses) {
        if (stepName.includes(process)) {
          relatedBusinessRules += rules.length;
        }
      }

      if (relatedBusinessRules === 0) {
        this.addIssue({
          type: 'alignment',
          severity: 'warning',
          message: `Workflow step '${step.name}' does not clearly relate to business rules`,
          suggestions: [
            'Link workflow step to specific business rules',
            'Use business terminology in step names',
            'Add business context to step description'
          ],
          affectedElements: [`workflowStep:${step.id}`]
        });
      }
    }
  }

  private analyzeTechnicalConsistency(document: ESLDocument): void {
    this.analyzeNamingConsistency(document);
    this.analyzeDataConsistency(document);
    this.analyzeAPIConsistency(document);
    this.analyzeWorkflowConsistency(document);
  }

  private analyzeNamingConsistency(document: ESLDocument): void {
    const namingPatterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/,
      kebabCase: /^[a-z][a-z0-9-]*$/
    };

    const fieldNames: string[] = [];
    const structureNames: string[] = [];

    if (document.dataStructures) {
      for (const structure of document.dataStructures) {
        structureNames.push(structure.name);
        if (structure.fields) {
          structure.fields.forEach(field => fieldNames.push(field.name));
        }
      }
    }

    const detectPattern = (names: string[]) => {
      const patterns = Object.entries(namingPatterns).map(([name, regex]) => ({
        name,
        matches: names.filter(n => regex.test(n)).length
      }));
      return patterns.sort((a, b) => b.matches - a.matches)[0];
    };

    const fieldPattern = detectPattern(fieldNames);
    const structurePattern = detectPattern(structureNames);

    if (fieldNames.length > 0 && fieldPattern.matches / fieldNames.length < 0.8) {
      this.addIssue({
        type: 'consistency',
        severity: 'warning',
        message: 'Inconsistent field naming convention detected',
        suggestions: [
          `Consider standardizing on ${fieldPattern.name} for field names`,
          'Update style guide to specify naming conventions',
          'Use automated linting to enforce consistency'
        ],
        affectedElements: ['fields']
      });
    }

    if (structureNames.length > 0 && structurePattern.matches / structureNames.length < 0.8) {
      this.addIssue({
        type: 'consistency',
        severity: 'warning',
        message: 'Inconsistent structure naming convention detected',
        suggestions: [
          `Consider standardizing on ${structurePattern.name} for structure names`,
          'Update style guide to specify naming conventions',
          'Use automated linting to enforce consistency'
        ],
        affectedElements: ['dataStructures']
      });
    }
  }

  private analyzeDataConsistency(document: ESLDocument): void {
    if (!document.dataStructures) return;

    const structureIds = new Set(document.dataStructures.map(ds => ds.id));
    
    for (const structure of document.dataStructures) {
      if (structure.fields) {
        for (const field of structure.fields) {
          if (field.type === 'reference' && field.referenceTo) {
            if (!structureIds.has(field.referenceTo)) {
              this.addIssue({
                type: 'consistency',
                severity: 'error',
                message: `Field '${field.name}' references unknown structure '${field.referenceTo}'`,
                suggestions: [
                  'Create the referenced data structure',
                  'Fix the reference name',
                  'Remove the invalid reference'
                ],
                affectedElements: [`dataStructure:${structure.id}`, `field:${field.name}`]
              });
            }
          }

          if (field.required && field.defaultValue !== undefined) {
            this.addIssue({
              type: 'consistency',
              severity: 'warning',
              message: `Required field '${field.name}' has default value - consider if it should be optional`,
              suggestions: [
                'Remove default value if field is truly required',
                'Make field optional if default value is appropriate',
                'Clarify business requirements for this field'
              ],
              affectedElements: [`dataStructure:${structure.id}`, `field:${field.name}`]
            });
          }
        }
      }
    }
  }

  private analyzeAPIConsistency(document: ESLDocument): void {
    if (!document.apiEndpoints) return;

    const pathMethods = new Map<string, string[]>();
    
    for (const endpoint of document.apiEndpoints) {
      if (!pathMethods.has(endpoint.path)) {
        pathMethods.set(endpoint.path, []);
      }
      pathMethods.get(endpoint.path)!.push(endpoint.method);

      if (!endpoint.responses || endpoint.responses.length === 0) {
        this.addIssue({
          type: 'consistency',
          severity: 'error',
          message: `API endpoint '${endpoint.path}' must define response specifications`,
          suggestions: [
            'Add at least one success response (200/201)',
            'Include error responses (400, 401, 403, 404, 500)',
            'Document response schemas and examples'
          ],
          affectedElements: [`apiEndpoint:${endpoint.id}`]
        });
      }

      const hasSuccessResponse = endpoint.responses?.some(r => r.statusCode >= 200 && r.statusCode < 300);
      if (!hasSuccessResponse) {
        this.addIssue({
          type: 'consistency',
          severity: 'warning',
          message: `API endpoint '${endpoint.path}' should define success responses`,
          suggestions: [
            'Add 200 response for GET operations',
            'Add 201 response for POST operations',
            'Add 204 response for DELETE operations'
          ],
          affectedElements: [`apiEndpoint:${endpoint.id}`]
        });
      }
    }

    for (const [path, methods] of pathMethods) {
      if (methods.includes('POST') && methods.includes('PUT') && !methods.includes('GET')) {
        this.addIssue({
          type: 'consistency',
          severity: 'info',
          message: `Path '${path}' supports create/update but not read operations`,
          suggestions: [
            'Consider adding GET method for resource retrieval',
            'Ensure consistent CRUD operation support',
            'Document why read operation is not needed'
          ],
          affectedElements: ['apiEndpoints']
        });
      }
    }
  }

  private analyzeWorkflowConsistency(document: ESLDocument): void {
    if (!document.workflowSteps) return;

    const stepIds = new Set(document.workflowSteps.map(step => step.id));
    const dependencyGraph = new Map<string, string[]>();

    for (const step of document.workflowSteps) {
      dependencyGraph.set(step.id, step.dependencies || []);

      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            this.addIssue({
              type: 'consistency',
              severity: 'error',
              message: `Workflow step '${step.name}' depends on undefined step '${dep}'`,
              suggestions: [
                'Create the missing workflow step',
                'Fix the dependency reference',
                'Remove the invalid dependency'
              ],
              affectedElements: [`workflowStep:${step.id}`]
            });
          }
        }
      }
    }

    if (this.hasCycles(dependencyGraph)) {
      this.addIssue({
        type: 'consistency',
        severity: 'error',
        message: 'Workflow contains circular dependencies',
        suggestions: [
          'Remove circular dependencies to create valid execution order',
          'Redesign workflow to eliminate cycles',
          'Consider splitting into multiple workflows'
        ],
        affectedElements: ['workflowSteps']
      });
    }
  }

  private analyzeAIOptimization(document: ESLDocument): void {
    if (!document.aiContext) {
      this.addIssue({
        type: 'optimization',
        severity: 'warning',
        message: 'Document lacks AI context for optimal AI tool performance',
        suggestions: [
          'Add aiContext section with model hints',
          'Include processing instructions for AI tools',
          'Add token optimization settings'
        ],
        affectedElements: ['document']
      });
      return;
    }

    const aiContext = document.aiContext;

    if (!aiContext.modelHints || aiContext.modelHints.length === 0) {
      this.addIssue({
        type: 'optimization',
        severity: 'info',
        message: 'AI context could include model hints for better code generation',
        suggestions: [
          'Add target frameworks and patterns',
          'Include architectural preferences',
          'Specify code generation strategies'
        ],
        affectedElements: ['aiContext']
      });
    }

    if (aiContext.tokenOptimization) {
      const tokenOpt = aiContext.tokenOptimization;
      
      if (tokenOpt.maxTokens && tokenOpt.maxTokens > 32000) {
        this.addIssue({
          type: 'optimization',
          severity: 'warning',
          message: 'Token limit exceeds typical LLM context windows',
          suggestions: [
            'Consider reducing maxTokens to 32000 or less',
            'Enable compression to fit within limits',
            'Split document into smaller, focused specifications'
          ],
          affectedElements: ['aiContext.tokenOptimization']
        });
      }

      if (!tokenOpt.compressionLevel || tokenOpt.compressionLevel === 'none') {
        this.addIssue({
          type: 'optimization',
          severity: 'info',
          message: 'Token compression could improve AI context efficiency',
          suggestions: [
            'Enable medium compression for balanced performance',
            'Use high compression for very large documents',
            'Specify priority fields to preserve important content'
          ],
          affectedElements: ['aiContext.tokenOptimization']
        });
      }
    }
  }

  private analyzeGovernanceCompliance(document: ESLDocument): void {
    if (!document.governance) {
      this.addIssue({
        type: 'compliance',
        severity: 'warning',
        message: 'Document lacks governance metadata for compliance tracking',
        suggestions: [
          'Add governance section with approval workflow',
          'Specify compliance requirements',
          'Include risk assessment'
        ],
        affectedElements: ['document']
      });
      return;
    }

    const governance = document.governance;

    if (governance.riskLevel === 'high' || governance.riskLevel === 'critical') {
      if (governance.approvalStatus !== 'approved') {
        this.addIssue({
          type: 'compliance',
          severity: 'error',
          message: 'High/critical risk documents must be approved before use',
          suggestions: [
            'Complete approval workflow',
            'Get required stakeholder approvals',
            'Document approval rationale'
          ],
          affectedElements: ['governance']
        });
      }

      if (!governance.auditTrail || governance.auditTrail.length === 0) {
        this.addIssue({
          type: 'compliance',
          severity: 'warning',
          message: 'High-risk documents should maintain detailed audit trails',
          suggestions: [
            'Add audit trail entries for all changes',
            'Include change rationale and approvers',
            'Maintain version history'
          ],
          affectedElements: ['governance']
        });
      }
    }

    if (governance.complianceFrameworks) {
      const hasDataPrivacy = governance.complianceFrameworks.some(f => 
        ['gdpr', 'ccpa', 'pipeda'].includes(f.toLowerCase())
      );
      
      if (hasDataPrivacy && this.containsPersonalData(document)) {
        if (!document.dataStructures?.some(ds => 
          ds.fields?.some(f => f.validation?.some(v => v.type === 'custom'))
        )) {
          this.addIssue({
            type: 'compliance',
            severity: 'warning',
            message: 'Personal data handling requires validation rules for privacy compliance',
            suggestions: [
              'Add validation rules for personal data fields',
              'Implement data anonymization where required',
              'Document data retention policies'
            ],
            affectedElements: ['dataStructures', 'governance']
          });
        }
      }
    }
  }

  private hasCycles(graph: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
  }

  private containsPersonalData(document: ESLDocument): boolean {
    if (!document.dataStructures) return false;

    const personalDataPatterns = [
      'email', 'phone', 'name', 'address', 'ssn', 'passport', 
      'credit', 'birth', 'age', 'gender', 'race', 'religion'
    ];

    for (const structure of document.dataStructures) {
      if (structure.fields) {
        for (const field of structure.fields) {
          const fieldName = field.name.toLowerCase();
          if (personalDataPatterns.some(pattern => fieldName.includes(pattern))) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private addIssue(issue: SemanticIssue): void {
    this.issues.push(issue);
  }

  private convertIssuesToErrors(): void {
    for (const issue of this.issues) {
      const error: ESLParseError = {
        message: issue.message,
        line: 0,
        column: 0,
        code: `SEMANTIC_${issue.type.toUpperCase()}`,
        severity: issue.severity,
        suggestions: issue.suggestions
      };

      if (issue.severity === 'error') {
        this.errors.push(error);
      } else {
        this.warnings.push(error);
      }
    }
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
    this.issues = [];
    this.errors = [];
    this.warnings = [];
  }
}