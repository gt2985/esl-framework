export interface ESLMetadata {
  version: string;
  id: string;
  title: string;
  description: string;
  author?: string;
  created?: string;
  lastModified?: string;
  tags?: string[];
  importMetadata?: {
    originalFormat: string;
    importedAt: string;
    enhanced: boolean;
    tool: string;
  };
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
  exceptions?: BusinessRuleException[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface BusinessRuleException {
  id: string;
  condition: string;
  action: string;
  reason?: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface AIContext {
  modelHints?: string[] | undefined;
  tokenOptimization?: TokenOptimization | undefined;
  examples?: AIExample[] | undefined;
  constraints?: string[] | undefined;
  processingInstructions?: string[] | undefined;
}

export interface TokenOptimization {
  maxTokens?: number;
  compressionLevel?: 'none' | 'low' | 'medium' | 'high';
  priorityFields?: string[];
  omitFields?: string[];
}

export interface AIExample {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  explanation?: string;
}

export interface GovernanceMetadata {
  approvalStatus: ApprovalStatus;
  approvedBy?: string | undefined;
  approvalDate?: string | undefined;
  reviewDate?: string | undefined;
  complianceFrameworks?: string[] | undefined;
  riskLevel: RiskLevel;
  auditTrail?: AuditEntry[] | undefined;
}

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'deprecated';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  details?: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface DataStructure {
  id: string;
  name: string;
  type: DataType;
  description: string;
  fields: DataField[];
  constraints?: DataConstraint[];
  relationships?: DataRelationship[];
  indexes?: DataIndex[];
}

export type DataType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';

export interface DataField {
  name: string;
  type: DataType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: ValidationRule[];
  format?: string;
  enumValues?: string[];
  referenceTo?: string;
}

export interface DataConstraint {
  type: 'unique' | 'foreign_key' | 'check' | 'not_null';
  fields: string[];
  condition?: string;
  referenceTable?: string;
  referenceFields?: string[];
}

export interface DataRelationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  targetEntity: string;
  foreignKey?: string;
  joinTable?: string;
  description?: string;
}

export interface DataIndex {
  name: string;
  fields: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ValidationRule {
  type: 'pattern' | 'range' | 'length' | 'custom';
  value?: unknown;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface APIEndpoint {
  id: string;
  name: string;
  path: string;
  method: HTTPMethod;
  description: string;
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  authentication?: AuthenticationRequirement[];
  rateLimit?: RateLimit;
  examples?: APIExample[];
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  type: DataType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface APIRequestBody {
  contentType: string;
  schema: string;
  required: boolean;
  description?: string;
  examples?: Record<string, unknown>[];
}

export interface APIResponse {
  statusCode: number;
  description: string;
  contentType?: string;
  schema?: string;
  headers?: Record<string, string>;
  examples?: Record<string, unknown>[];
}

export interface AuthenticationRequirement {
  type: 'bearer' | 'basic' | 'api_key' | 'oauth2';
  scheme?: string;
  bearerFormat?: string;
  description?: string;
}

export interface RateLimit {
  requests: number;
  window: string;
  scope: 'user' | 'ip' | 'global';
}

export interface APIExample {
  name: string;
  description: string;
  request: {
    headers?: Record<string, string>;
    parameters?: Record<string, unknown>;
    body?: Record<string, unknown>;
  };
  response: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  description: string;
  condition?: string | undefined;
  action: string;
  timeout?: number | undefined;
  retryPolicy?: RetryPolicy | undefined;
  rollbackAction?: string | undefined;
  dependencies?: string[] | undefined;
  outputs?: Record<string, string> | undefined;
}

export type StepType = 'action' | 'decision' | 'parallel' | 'loop' | 'human' | 'api_call' | 'data_transform';

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  initialDelay: number;
  maxDelay?: number;
  retryConditions?: string[];
}

export interface ESLDocument {
  metadata: ESLMetadata;
  businessRules?: BusinessRule[] | undefined;
  dataStructures?: DataStructure[] | undefined;
  apiEndpoints?: APIEndpoint[] | undefined;
  workflowSteps?: WorkflowStep[] | undefined;
  aiContext?: AIContext | undefined;
  governance?: GovernanceMetadata | undefined;
  extends?: string[] | undefined;
  imports?: ImportStatement[] | undefined;
  exports?: ExportStatement[] | undefined;
}

export interface ImportStatement {
  from: string;
  items?: string[];
  alias?: string;
  version?: string;
}

export interface ExportStatement {
  items: string[];
  to?: string;
  visibility: 'public' | 'protected' | 'private';
}

export interface ESLParseError {
  message: string;
  line: number;
  column: number;
  code: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[] | undefined;
}

export interface ESLValidationResult {
  valid: boolean;
  errors: ESLParseError[];
  warnings: ESLParseError[];
  document?: ESLDocument | undefined;
}

export interface ESLProcessingOptions {
  validateSchema?: boolean;
  resolveInheritance?: boolean;
  processImports?: boolean;
  enableSemanticAnalysis?: boolean;
  optimizeForAI?: boolean;
  targetFormat?: 'typescript' | 'json-schema' | 'openapi' | 'graphql';
}

export interface ProcessingContext {
  id?: string;
  document?: ESLDocument;
  filePath?: string;
  basePath: string;
  importCache: Map<string, ESLDocument>;
  validationErrors: ESLParseError[];
  processingOptions: ESLProcessingOptions;
  metadata?: {
    created?: string;
    tokenBudget?: number;
    targetModel?: string;
    priorityFields?: string[];
    compressionLevel?: string;
    mergedFrom?: string[];
  };
  relationships?: Map<string, string[]>;
  dependencies?: Set<string>;
  performance?: {
    parseTime: number;
    validationTime: number;
    optimizationTime: number;
    totalTime: number;
    inheritanceTime?: number;
    mergeTime?: number;
  };
  metrics?: {
    creationTime: number;
    optimizationTime: number;
    tokenCount: number;
    chunkCount: number;
    compressionRatio: number;
    qualityScore: number;
  };
  optimization?: {
    applied: boolean;
    originalTokens: number;
    finalTokens: number;
    reason?: string;
    metrics?: any;
    techniques?: string[];
  };
  inheritanceChain?: any;
  fromCache?: boolean;
}