import {
  ESLDocument,
  ESLParseError,
  BusinessRule,
  DataStructure,
  APIEndpoint,
  WorkflowStep,
  ValidationRule as ESLValidationRule,
  ProcessingContext
} from '../core/types.js';

export interface ValidationRule {
  name: string;
  description: string;
  category: 'structure' | 'business' | 'technical' | 'governance' | 'ai';
  severity: 'error' | 'warning' | 'info';
  validate: (document: ESLDocument, context?: ProcessingContext) => ESLParseError[];
}

export class ValidationRuleEngine {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
  }

  executeRule(ruleName: string, document: ESLDocument, context?: ProcessingContext): ESLParseError[] {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return [{
        message: `Unknown validation rule: ${ruleName}`,
        line: 0,
        column: 0,
        code: 'UNKNOWN_RULE',
        severity: 'error'
      }];
    }

    try {
      return rule.validate(document, context);
    } catch (error) {
      return [{
        message: `Rule execution error: ${error instanceof Error ? error.message : String(error)}`,
        line: 0,
        column: 0,
        code: 'RULE_EXECUTION_ERROR',
        severity: 'error'
      }];
    }
  }

  executeAllRules(document: ESLDocument, context?: ProcessingContext): ESLParseError[] {
    const allErrors: ESLParseError[] = [];

    for (const rule of this.rules.values()) {
      const errors = this.executeRule(rule.name, document, context);
      allErrors.push(...errors);
    }

    return allErrors;
  }

  getRulesByCategory(category: ValidationRule['category']): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  private registerDefaultRules(): void {
    this.registerStructureRules();
    this.registerBusinessRules();
    this.registerTechnicalRules();
    this.registerGovernanceRules();
    this.registerAIRules();
  }

  private registerStructureRules(): void {
    this.registerRule({
      name: 'require_unique_ids',
      description: 'Ensures all IDs within document sections are unique',
      category: 'structure',
      severity: 'error',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];
        const allIds = new Set<string>();

        const sections = [
          { name: 'businessRules', items: document.businessRules || [] },
          { name: 'dataStructures', items: document.dataStructures || [] },
          { name: 'apiEndpoints', items: document.apiEndpoints || [] },
          { name: 'workflowSteps', items: document.workflowSteps || [] }
        ];

        for (const section of sections) {
          for (const item of section.items) {
            if (item.id) {
              if (allIds.has(item.id)) {
                errors.push({
                  message: `Duplicate ID '${item.id}' found in ${section.name}`,
                  line: 0,
                  column: 0,
                  code: 'DUPLICATE_ID',
                  severity: 'error'
                });
              } else {
                allIds.add(item.id);
              }
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_field_naming',
      description: 'Validates field naming conventions',
      category: 'structure',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.dataStructures) {
          for (const structure of document.dataStructures) {
            if (structure.fields) {
              for (const field of structure.fields) {
                if (field.name && !/^[a-z][a-zA-Z0-9_]*$/.test(field.name)) {
                  errors.push({
                    message: `Field '${field.name}' should use camelCase naming convention`,
                    line: 0,
                    column: 0,
                    code: 'INVALID_FIELD_NAMING',
                    severity: 'warning'
                  });
                }
              }
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'require_descriptions',
      description: 'Ensures all major elements have descriptions',
      category: 'structure',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        const checkDescription = (item: any, type: string, name: string) => {
          if (!item.description || item.description.trim().length === 0) {
            errors.push({
              message: `${type} '${name}' should have a description`,
              line: 0,
              column: 0,
              code: 'MISSING_DESCRIPTION',
              severity: 'warning'
            });
          }
        };

        if (document.businessRules) {
          document.businessRules.forEach(rule => 
            checkDescription(rule, 'Business rule', rule.name || rule.id)
          );
        }

        if (document.dataStructures) {
          document.dataStructures.forEach(structure => 
            checkDescription(structure, 'Data structure', structure.name || structure.id)
          );
        }

        if (document.apiEndpoints) {
          document.apiEndpoints.forEach(endpoint => 
            checkDescription(endpoint, 'API endpoint', endpoint.name || endpoint.id)
          );
        }

        return errors;
      }
    });
  }

  private registerBusinessRules(): void {
    this.registerRule({
      name: 'validate_business_rule_completeness',
      description: 'Ensures business rules have all required components',
      category: 'business',
      severity: 'error',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.businessRules) {
          for (const rule of document.businessRules) {
            if (!rule.condition || rule.condition.trim().length === 0) {
              errors.push({
                message: `Business rule '${rule.name}' must have a condition`,
                line: 0,
                column: 0,
                code: 'MISSING_RULE_CONDITION',
                severity: 'error'
              });
            }

            if (!rule.action || rule.action.trim().length === 0) {
              errors.push({
                message: `Business rule '${rule.name}' must have an action`,
                line: 0,
                column: 0,
                code: 'MISSING_RULE_ACTION',
                severity: 'error'
              });
            }

            if (rule.priority < 1 || rule.priority > 10) {
              errors.push({
                message: `Business rule '${rule.name}' priority must be between 1 and 10`,
                line: 0,
                column: 0,
                code: 'INVALID_RULE_PRIORITY',
                severity: 'warning'
              });
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_business_rule_exceptions',
      description: 'Validates business rule exception handling',
      category: 'business',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.businessRules) {
          for (const rule of document.businessRules) {
            if (rule.exceptions && rule.exceptions.length > 0) {
              for (const exception of rule.exceptions) {
                if (!exception.reason) {
                  errors.push({
                    message: `Exception in rule '${rule.name}' should include a reason`,
                    line: 0,
                    column: 0,
                    code: 'MISSING_EXCEPTION_REASON',
                    severity: 'warning'
                  });
                }

                if (!exception.approvedBy) {
                  errors.push({
                    message: `Exception in rule '${rule.name}' should specify who approved it`,
                    line: 0,
                    column: 0,
                    code: 'MISSING_EXCEPTION_APPROVER',
                    severity: 'warning'
                  });
                }
              }
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'check_business_technical_alignment',
      description: 'Validates alignment between business rules and technical implementation',
      category: 'business',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (!document.businessRules || !document.dataStructures) {
          return errors;
        }

        const entityNames = new Set(
          document.dataStructures.map(ds => ds.name.toLowerCase())
        );

        for (const rule of document.businessRules) {
          const ruleText = `${rule.condition} ${rule.action}`.toLowerCase();
          
          let referencesEntity = false;
          for (const entityName of entityNames) {
            if (ruleText.includes(entityName)) {
              referencesEntity = true;
              break;
            }
          }

          if (!referencesEntity) {
            errors.push({
              message: `Business rule '${rule.name}' does not reference any data structures - consider adding technical implementation details`,
              line: 0,
              column: 0,
              code: 'DISCONNECTED_BUSINESS_RULE',
              severity: 'warning'
            });
          }
        }

        return errors;
      }
    });
  }

  private registerTechnicalRules(): void {
    this.registerRule({
      name: 'validate_api_methods',
      description: 'Validates HTTP methods are appropriate for operations',
      category: 'technical',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.apiEndpoints) {
          for (const endpoint of document.apiEndpoints) {
            const path = endpoint.path.toLowerCase();
            const method = endpoint.method.toUpperCase();

            if (path.includes('/create') && method !== 'POST') {
              errors.push({
                message: `Endpoint '${endpoint.path}' suggests creation but uses ${method} instead of POST`,
                line: 0,
                column: 0,
                code: 'INAPPROPRIATE_HTTP_METHOD',
                severity: 'warning'
              });
            }

            if (path.includes('/update') && !['PUT', 'PATCH'].includes(method)) {
              errors.push({
                message: `Endpoint '${endpoint.path}' suggests update but uses ${method} instead of PUT/PATCH`,
                line: 0,
                column: 0,
                code: 'INAPPROPRIATE_HTTP_METHOD',
                severity: 'warning'
              });
            }

            if (path.includes('/delete') && method !== 'DELETE') {
              errors.push({
                message: `Endpoint '${endpoint.path}' suggests deletion but uses ${method} instead of DELETE`,
                line: 0,
                column: 0,
                code: 'INAPPROPRIATE_HTTP_METHOD',
                severity: 'warning'
              });
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_data_relationships',
      description: 'Validates data structure relationships are properly defined',
      category: 'technical',
      severity: 'error',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.dataStructures) {
          const structureIds = new Set(document.dataStructures.map(ds => ds.id));

          for (const structure of document.dataStructures) {
            if (structure.relationships) {
              for (const relationship of structure.relationships) {
                if (!structureIds.has(relationship.targetEntity)) {
                  errors.push({
                    message: `Data structure '${structure.name}' references unknown target entity '${relationship.targetEntity}'`,
                    line: 0,
                    column: 0,
                    code: 'INVALID_RELATIONSHIP_TARGET',
                    severity: 'error'
                  });
                }
              }
            }

            if (structure.fields) {
              for (const field of structure.fields) {
                if (field.type === 'reference' && field.referenceTo) {
                  if (!structureIds.has(field.referenceTo)) {
                    errors.push({
                      message: `Field '${field.name}' in '${structure.name}' references unknown structure '${field.referenceTo}'`,
                      line: 0,
                      column: 0,
                      code: 'INVALID_FIELD_REFERENCE',
                      severity: 'error'
                    });
                  }
                }
              }
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_workflow_dependencies',
      description: 'Validates workflow step dependencies form valid DAG',
      category: 'technical',
      severity: 'error',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (!document.workflowSteps || document.workflowSteps.length === 0) {
          return errors;
        }

        const stepIds = new Set(document.workflowSteps.map(step => step.id));
        const dependencies = new Map<string, string[]>();

        for (const step of document.workflowSteps) {
          dependencies.set(step.id, step.dependencies || []);

          if (step.dependencies) {
            for (const dep of step.dependencies) {
              if (!stepIds.has(dep)) {
                errors.push({
                  message: `Workflow step '${step.name}' depends on unknown step '${dep}'`,
                  line: 0,
                  column: 0,
                  code: 'INVALID_WORKFLOW_DEPENDENCY',
                  severity: 'error'
                });
              }
            }
          }
        }

        const hasCycle = this.detectCycles(dependencies);
        if (hasCycle) {
          errors.push({
            message: 'Workflow contains circular dependencies',
            line: 0,
            column: 0,
            code: 'CIRCULAR_WORKFLOW_DEPENDENCY',
            severity: 'error'
          });
        }

        return errors;
      }
    });
  }

  private registerGovernanceRules(): void {
    this.registerRule({
      name: 'validate_approval_workflow',
      description: 'Validates governance approval requirements',
      category: 'governance',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.governance) {
          const gov = document.governance;

          if (gov.approvalStatus === 'approved' && !gov.approvedBy) {
            errors.push({
              message: 'Approved documents must specify who approved them',
              line: 0,
              column: 0,
              code: 'MISSING_APPROVER',
              severity: 'error'
            });
          }

          if (gov.approvalStatus === 'approved' && !gov.approvalDate) {
            errors.push({
              message: 'Approved documents must specify approval date',
              line: 0,
              column: 0,
              code: 'MISSING_APPROVAL_DATE',
              severity: 'error'
            });
          }

          if (gov.riskLevel === 'high' || gov.riskLevel === 'critical') {
            if (gov.approvalStatus !== 'approved') {
              errors.push({
                message: 'High/critical risk documents must be approved',
                line: 0,
                column: 0,
                code: 'UNAPPROVED_HIGH_RISK',
                severity: 'warning'
              });
            }
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_compliance_requirements',
      description: 'Validates compliance framework requirements',
      category: 'governance',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.governance?.complianceFrameworks) {
          const frameworks = document.governance.complianceFrameworks;

          if (frameworks.includes('gdpr') || frameworks.includes('ccpa')) {
            const hasPersonalData = this.checkForPersonalData(document);
            if (hasPersonalData && !document.governance.auditTrail) {
              errors.push({
                message: 'Documents with personal data and GDPR/CCPA compliance must maintain audit trails',
                line: 0,
                column: 0,
                code: 'MISSING_AUDIT_TRAIL',
                severity: 'warning'
              });
            }
          }
        }

        return errors;
      }
    });
  }

  private registerAIRules(): void {
    this.registerRule({
      name: 'validate_ai_context_optimization',
      description: 'Validates AI context is properly optimized',
      category: 'ai',
      severity: 'warning',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (!document.aiContext) {
          errors.push({
            message: 'Document should include AI context for optimal AI tool performance',
            line: 0,
            column: 0,
            code: 'MISSING_AI_CONTEXT',
            severity: 'warning'
          });
          return errors;
        }

        const aiContext = document.aiContext;

        if (!aiContext.modelHints || aiContext.modelHints.length === 0) {
          errors.push({
            message: 'AI context should include model hints for better generation',
            line: 0,
            column: 0,
            code: 'MISSING_MODEL_HINTS',
            severity: 'warning'
          });
        }

        if (aiContext.tokenOptimization) {
          const tokenOpt = aiContext.tokenOptimization;
          
          if (tokenOpt.maxTokens && tokenOpt.maxTokens > 32000) {
            errors.push({
              message: 'AI context maxTokens exceeds typical LLM limits, consider compression',
              line: 0,
              column: 0,
              code: 'EXCESSIVE_TOKEN_LIMIT',
              severity: 'warning'
            });
          }
        }

        return errors;
      }
    });

    this.registerRule({
      name: 'validate_ai_generation_hints',
      description: 'Validates AI generation hints are actionable',
      category: 'ai',
      severity: 'info',
      validate: (document: ESLDocument) => {
        const errors: ESLParseError[] = [];

        if (document.businessRules) {
          for (const rule of document.businessRules) {
            if (rule.metadata?.ai_hint) {
              const hint = String(rule.metadata.ai_hint);
              if (!hint.includes('@implementation')) {
                errors.push({
                  message: `Business rule '${rule.name}' AI hint should include @implementation guidance`,
                  line: 0,
                  column: 0,
                  code: 'VAGUE_AI_HINT',
                  severity: 'info'
                });
              }
            }
          }
        }

        return errors;
      }
    });
  }

  private detectCycles(dependencies: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const deps = dependencies.get(node) || [];
      for (const dep of deps) {
        if (dfs(dep)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of dependencies.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return true;
        }
      }
    }

    return false;
  }

  private checkForPersonalData(document: ESLDocument): boolean {
    if (!document.dataStructures) {
      return false;
    }

    const personalDataFields = ['email', 'phone', 'name', 'address', 'ssn', 'passport'];

    for (const structure of document.dataStructures) {
      if (structure.fields) {
        for (const field of structure.fields) {
          if (personalDataFields.some(pii => field.name.toLowerCase().includes(pii))) {
            return true;
          }
        }
      }
    }

    return false;
  }
}