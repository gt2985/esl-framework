export const ESL_VERSION = '1.0.0';

export const ESL_FILE_EXTENSIONS = ['.esl', '.esl.yaml', '.esl.yml'] as const;

export const DEFAULT_ESL_EXTENSION = '.esl.yaml';

export const ESL_SCHEMA_VERSION = '1.0.0';

export const SUPPORTED_HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export const SUPPORTED_DATA_TYPES = [
  'object', 
  'array', 
  'string', 
  'number', 
  'boolean', 
  'date', 
  'enum', 
  'reference'
] as const;

export const STEP_TYPES = [
  'action',
  'decision', 
  'parallel',
  'loop',
  'human',
  'api_call',
  'data_transform'
] as const;

export const APPROVAL_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'deprecated'] as const;

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const AUTHENTICATION_TYPES = ['bearer', 'basic', 'api_key', 'oauth2'] as const;

export const VALIDATION_RULE_TYPES = ['pattern', 'range', 'length', 'custom'] as const;

export const COMPRESSION_LEVELS = ['none', 'low', 'medium', 'high'] as const;

export const BACKOFF_STRATEGIES = ['fixed', 'linear', 'exponential'] as const;

export const ERROR_SEVERITIES = ['error', 'warning', 'info'] as const;

export const VISIBILITY_LEVELS = ['public', 'protected', 'private'] as const;

export const TARGET_FORMATS = ['typescript', 'json-schema', 'openapi', 'graphql'] as const;

export const DEFAULT_PROCESSING_OPTIONS = {
  validateSchema: true,
  resolveInheritance: true,
  processImports: true,
  enableSemanticAnalysis: false,
  optimizeForAI: false,
  targetFormat: 'typescript' as const
};

export const DEFAULT_RETRY_POLICY = {
  maxAttempts: 3,
  backoffStrategy: 'exponential' as const,
  initialDelay: 1000,
  maxDelay: 30000
};

export const DEFAULT_RATE_LIMIT = {
  requests: 100,
  window: '1h',
  scope: 'user' as const
};

export const TOKEN_LIMITS = {
  DEFAULT_MAX_TOKENS: 4000,
  FIELD_NAME_MAX_LENGTH: 64,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MAX_LENGTH: 128
};

export const RESERVED_KEYWORDS = [
  'metadata',
  'businessRules',
  'dataStructures', 
  'apiEndpoints',
  'workflowSteps',
  'aiContext',
  'governance',
  'extends',
  'imports',
  'exports'
] as const;

export const ESL_MIME_TYPES = {
  YAML: 'application/x-esl+yaml',
  JSON: 'application/x-esl+json'
} as const;