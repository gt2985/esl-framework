# API Reference

This document provides comprehensive API documentation for programmatic usage of the ESL Framework.

## Installation

```bash
npm install esl-framework
```

## Core Classes

### ESLFramework

Main framework orchestrator for processing ESL documents.

```typescript
import { ESLFramework } from 'esl-framework';

const framework = new ESLFramework({
  validateSchema: true,
  enableSemanticAnalysis: true,
  optimizeForAI: true
});
```

#### Constructor Options

```typescript
interface ESLProcessingOptions {
  validateSchema?: boolean;         // Enable schema validation
  enableSemanticAnalysis?: boolean; // Enable semantic analysis
  optimizeForAI?: boolean;         // Enable AI optimization
  resolveInheritance?: boolean;    // Resolve inheritance chains
  processImports?: boolean;        // Process import statements
}
```

#### Methods

##### `parseFile(filePath: string): Promise<ESLValidationResult>`

Parse an ESL file from disk.

```typescript
const result = await framework.parseFile('./my-spec.esl.yaml');
if (result.valid) {
  console.log('Specification is valid');
  console.log(result.document);
}
```

##### `parseContent(content: string, filePath?: string): Promise<ESLValidationResult>`

Parse ESL content from a string.

```typescript
const yamlContent = `
eslVersion: "1.0.0"
project:
  name: "My API"
  version: "1.0.0"
dataModels:
  User:
    properties:
      id: { type: string }
      name: { type: string }
`;

const result = await framework.parseContent(yamlContent);
```

##### `validateDocument(document: ESLDocument): Promise<ESLValidationResult>`

Validate an ESL document.

```typescript
const validationResult = await framework.validateDocument(document);
console.log(`Valid: ${validationResult.valid}`);
console.log(`Errors: ${validationResult.errors.length}`);
```

##### `processDocument(document: ESLDocument): Promise<ESLValidationResult>`

Process an ESL document with full analysis.

```typescript
const processedResult = await framework.processDocument(document);
// Includes validation, inheritance resolution, and semantic analysis
```

### ContextManager

AI-optimized context management for ESL specifications.

```typescript
import { ContextManager } from 'esl-framework';

const contextManager = new ContextManager({
  maxTokens: 8000,
  compressionLevel: 'medium',
  targetModel: 'gpt-4',
  enableCaching: true
});
```

#### Constructor Options

```typescript
interface ContextManagerOptions {
  maxTokens?: number;
  compressionLevel?: 'low' | 'medium' | 'high';
  priorityFields?: string[];
  targetModel?: string;
  preserveMetadata?: boolean;
  enableCaching?: boolean;
  chunkingStrategy?: ChunkingStrategy;
}
```

#### Methods

##### `createContext(document: ESLDocument): Promise<ProcessingContext>`

Create an optimized context from an ESL document.

```typescript
const context = await contextManager.createContext(document);
console.log(`Context ID: ${context.id}`);
console.log(`Token count: ${context.metrics.tokenCount}`);
```

##### `chunkDocument(document: ESLDocument, chunkSize?: number): Promise<ContextChunk[]>`

Split a document into semantic chunks.

```typescript
const chunks = await contextManager.chunkDocument(document, 2000);
console.log(`Created ${chunks.length} chunks`);

for (const chunk of chunks) {
  console.log(`Chunk ${chunk.id}: ${chunk.tokenCount} tokens`);
}
```

##### `optimizeContext(context: ProcessingContext, targetTokens: number): Promise<ProcessingContext>`

Optimize context for specific token budget.

```typescript
const optimizedContext = await contextManager.optimizeContext(context, 4000);
console.log(`Optimized from ${context.metrics.originalTokens} to ${optimizedContext.metrics.optimizedTokens} tokens`);
```

##### `mergeContexts(contexts: ProcessingContext[], options?: MergeOptions): Promise<ProcessingContext>`

Merge multiple contexts.

```typescript
const mergedContext = await contextManager.mergeContexts([context1, context2], {
  maxTokens: 10000,
  preserveRelationships: true
});
```

##### `streamContext(document: ESLDocument, options?: StreamingOptions): AsyncGenerator<ContextChunk>`

Stream chunks for large documents.

```typescript
for await (const chunk of contextManager.streamContext(document)) {
  // Process chunk in real-time
  await processChunk(chunk);
}
```

##### `analyzeContext(context: ProcessingContext): Promise<ContextAnalysis>`

Analyze context quality.

```typescript
const analysis = await contextManager.analyzeContext(context);
console.log(`Quality score: ${analysis.qualityScore}`);
console.log(`Suggestions: ${analysis.suggestions.join(', ')}`);
```

### SemanticChunker

Intelligent document chunking with relationship preservation.

```typescript
import { SemanticChunker } from 'esl-framework';

const chunker = new SemanticChunker();
```

#### Methods

##### `chunkByBusinessRules(document: ESLDocument, maxChunkSize?: number): Promise<ContextChunk[]>`

Chunk by business rule dependencies.

```typescript
const chunks = await chunker.chunkByBusinessRules(document, 2000);
```

##### `chunkByDataStructures(document: ESLDocument, maxChunkSize?: number): Promise<ContextChunk[]>`

Chunk by data structure relationships.

```typescript
const chunks = await chunker.chunkByDataStructures(document, 2500);
```

##### `chunkByAPIEndpoints(document: ESLDocument, maxChunkSize?: number): Promise<ContextChunk[]>`

Chunk by API endpoint domains.

```typescript
const chunks = await chunker.chunkByAPIEndpoints(document, 1800);
```

##### `chunkByStrategy(document: ESLDocument, strategy: ChunkingStrategy): Promise<ContextChunk[]>`

Use specific chunking strategy.

```typescript
const chunks = await chunker.chunkByStrategy(document, {
  name: 'semantic',
  maxChunkSize: 2000,
  preserveRelationships: true,
  priorityFields: ['businessRules', 'dataStructures']
});
```

##### `validateChunkRelationships(chunks: ContextChunk[]): Promise<ESLValidationResult>`

Validate chunk quality.

```typescript
const validation = await chunker.validateChunkRelationships(chunks);
if (!validation.valid) {
  console.log('Chunk validation failed:', validation.errors);
}
```

### ContextOptimizer

AI model-specific optimization engine.

```typescript
import { ContextOptimizer } from 'esl-framework';

const optimizer = new ContextOptimizer();
```

#### Methods

##### `optimizeContext(context: ProcessingContext, options: OptimizationOptions): Promise<ProcessingContext>`

Optimize context for AI consumption.

```typescript
const optimized = await optimizer.optimizeContext(context, {
  maxTokens: 8000,
  targetModel: 'gpt-4',
  compressionLevel: 'high'
});
```

##### `optimizeForModel(context: ProcessingContext, modelName: string): Promise<ProcessingContext>`

Optimize for specific AI model.

```typescript
const gpt4Context = await optimizer.optimizeForModel(context, 'gpt-4');
const claudeContext = await optimizer.optimizeForModel(context, 'claude-3');
```

##### `estimateTokens(content: any): Promise<number>`

Estimate token count.

```typescript
const tokens = await optimizer.estimateTokens(document);
console.log(`Estimated ${tokens} tokens`);
```

##### `compressContent(content: any, targetRatio: number): Promise<CompressionResult>`

Compress content by target ratio.

```typescript
const compressed = await optimizer.compressContent(document, 0.5); // 50% compression
console.log(`Compressed from ${compressed.originalSize} to ${compressed.compressedSize} tokens`);
```

### ESLValidator

Comprehensive validation engine.

```typescript
import { ESLValidator } from 'esl-framework';

const validator = new ESLValidator({
  strictMode: true,
  validateReferences: true,
  validateBusinessLogic: true
});
```

#### Methods

##### `validateDocument(document: ESLDocument): Promise<ESLValidationResult>`

Validate ESL document.

```typescript
const result = await validator.validateDocument(document);
if (!result.valid) {
  result.errors.forEach(error => {
    console.log(`Error: ${error.message} at line ${error.line}`);
  });
}
```

##### `validateSchema(document: ESLDocument): Promise<ESLValidationResult>`

Schema-only validation.

```typescript
const schemaResult = await validator.validateSchema(document);
```

##### `validateBusinessLogic(document: ESLDocument): Promise<ESLValidationResult>`

Business logic validation.

```typescript
const businessResult = await validator.validateBusinessLogic(document);
```

### SemanticAnalyzer

Semantic analysis for business alignment.

```typescript
import { SemanticAnalyzer } from 'esl-framework';

const analyzer = new SemanticAnalyzer({
  analyzeBusinessAlignment: true,
  analyzeTechnicalConsistency: true
});
```

#### Methods

##### `analyzeDocument(document: ESLDocument): Promise<ESLValidationResult>`

Perform semantic analysis.

```typescript
const analysis = await analyzer.analyzeDocument(document);
```

## Type Definitions

### ESLDocument

```typescript
interface ESLDocument {
  metadata: {
    version: string;
    id: string;
    title: string;
    description: string;
    author: string;
    created: string;
  };
  businessRules: BusinessRule[];
  dataStructures: DataStructure[];
  apiEndpoints: APIEndpoint[];
  workflowSteps: WorkflowStep[];
  governance?: Governance;
  aiContext?: AIContext;
  extends?: string[];
  imports?: string[];
}
```

### BusinessRule

```typescript
interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  tags?: string[];
  exceptions?: RuleException[];
  metadata?: any;
}
```

### DataStructure

```typescript
interface DataStructure {
  id: string;
  name: string;
  description: string;
  type: 'interface' | 'class' | 'enum' | 'type';
  fields: Field[];
  relationships?: Relationship[];
  constraints?: Constraint[];
  metadata?: any;
}
```

### Field

```typescript
interface Field {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: FieldValidation;
  metadata?: any;
}
```

### APIEndpoint

```typescript
interface APIEndpoint {
  id: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
  authentication?: Authentication;
  metadata?: any;
}
```

### WorkflowStep

```typescript
interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'decision';
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  dependencies?: string[];
  metadata?: any;
}
```

### ProcessingContext

```typescript
interface ProcessingContext {
  id: string;
  document: ESLDocument;
  filePath: string;
  basePath: string;
  importCache: Map<string, ESLDocument>;
  validationErrors: ValidationError[];
  processingOptions: ESLProcessingOptions;
  metadata: {
    created: string;
    tokenBudget: number;
    targetModel: string;
    priorityFields: string[];
  };
  relationships: Map<string, string[]>;
  dependencies: Set<string>;
  performance: {
    parseTime: number;
    validationTime: number;
    optimizationTime: number;
    totalTime: number;
  };
  metrics?: ContextMetrics;
  optimization?: {
    applied: boolean;
    originalTokens: number;
    finalTokens: number;
    metrics: OptimizationMetrics;
    techniques: string[];
  };
}
```

### ContextChunk

```typescript
interface ContextChunk {
  id: string;
  content: any;
  tokenCount: number;
  relationships: string[];
  priority: number;
  metadata: ChunkMetadata;
  boundaries: ChunkBoundary;
}
```

### ESLValidationResult

```typescript
interface ESLValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  document?: ESLDocument;
  metrics?: ValidationMetrics;
}
```

### ValidationError

```typescript
interface ValidationError {
  message: string;
  line: number;
  column: number;
  code: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  metadata?: any;
}
```

## Usage Examples

### Basic Document Processing

```typescript
import { ESLFramework } from 'esl-framework';

const framework = new ESLFramework({
  validateSchema: true,
  enableSemanticAnalysis: true
});

async function processSpecification(filePath: string) {
  try {
    // Parse and validate
    const result = await framework.parseFile(filePath);
    
    if (!result.valid) {
      console.log('Validation failed:');
      result.errors.forEach(error => {
        console.log(`- ${error.message} (line ${error.line})`);
      });
      return;
    }
    
    // Process with full analysis
    const processed = await framework.processDocument(result.document);
    
    console.log('Document processed successfully');
    console.log(`Performance: ${processed.performance.totalTime}ms`);
    
    return processed.document;
  } catch (error) {
    console.error('Processing failed:', error);
  }
}
```

### AI Context Optimization

```typescript
import { ContextManager } from 'esl-framework';

const contextManager = new ContextManager({
  maxTokens: 8000,
  targetModel: 'gpt-4',
  compressionLevel: 'medium'
});

async function optimizeForAI(document: ESLDocument) {
  // Create optimized context
  const context = await contextManager.createContext(document);
  
  // Check if within token budget
  if (context.metrics.tokenCount > 8000) {
    // Chunk the document
    const chunks = await contextManager.chunkDocument(document, 2000);
    
    console.log(`Split into ${chunks.length} chunks`);
    
    // Process chunks individually
    for (const chunk of chunks) {
      console.log(`Processing chunk ${chunk.id} (${chunk.tokenCount} tokens)`);
      // Send to AI model
      const result = await processWithAI(chunk);
      console.log(`Result: ${result.status}`);
    }
  } else {
    // Process entire document
    const result = await processWithAI(context);
    console.log(`Processed in single context: ${result.status}`);
  }
}
```

### Streaming Large Documents

```typescript
import { ContextManager } from 'esl-framework';

async function streamLargeDocument(document: ESLDocument) {
  const contextManager = new ContextManager();
  
  // Stream processing
  for await (const chunk of contextManager.streamContext(document, {
    chunkSize: 1500,
    overlap: 200,
    preserveRelationships: true
  })) {
    console.log(`Processing chunk ${chunk.id}`);
    
    // Process chunk in real-time
    const result = await processChunk(chunk);
    
    if (result.success) {
      console.log(`✅ Chunk ${chunk.id} processed successfully`);
    } else {
      console.log(`❌ Chunk ${chunk.id} failed: ${result.error}`);
    }
  }
}
```

### Custom Validation

```typescript
import { ESLValidator, ValidationRule } from 'esl-framework';

// Create custom validation rule
class CustomBusinessRuleValidator implements ValidationRule {
  name = 'custom-business-rule';
  
  validate(document: ESLDocument): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Custom validation logic
    for (const rule of document.businessRules) {
      if (!rule.condition.includes('user.')) {
        errors.push({
          message: `Business rule ${rule.id} must reference user context`,
          line: 0,
          column: 0,
          code: 'MISSING_USER_CONTEXT',
          severity: 'warning'
        });
      }
    }
    
    return Promise.resolve(errors);
  }
}

// Use custom validator
const validator = new ESLValidator();
validator.addRule(new CustomBusinessRuleValidator());

const result = await validator.validateDocument(document);
```

## Error Handling

### ESLError

```typescript
class ESLError extends Error {
  constructor(
    message: string,
    public code: string,
    public line?: number,
    public column?: number,
    public metadata?: any
  ) {
    super(message);
    this.name = 'ESLError';
  }
}
```

### Common Error Codes

- `PARSE_ERROR`: YAML parsing failed
- `SCHEMA_VALIDATION_FAILED`: Schema validation failed
- `INVALID_REFERENCE`: Invalid reference in document
- `MISSING_DEPENDENCY`: Missing dependency
- `INHERITANCE_FAILED`: Inheritance resolution failed
- `CONTEXT_OPTIMIZATION_FAILED`: Context optimization failed
- `TOKEN_LIMIT_EXCEEDED`: Token limit exceeded

### Error Handling Example

```typescript
try {
  const result = await framework.parseFile('./spec.esl.yaml');
} catch (error) {
  if (error instanceof ESLError) {
    console.log(`ESL Error: ${error.message}`);
    console.log(`Code: ${error.code}`);
    if (error.line) {
      console.log(`Location: line ${error.line}, column ${error.column}`);
    }
  } else {
    console.log(`Unexpected error: ${error.message}`);
  }
}
```

## Configuration

### Framework Configuration

```typescript
const framework = new ESLFramework({
  validateSchema: true,
  enableSemanticAnalysis: true,
  optimizeForAI: true,
  resolveInheritance: true,
  processImports: true
});
```

### Context Manager Configuration

```typescript
const contextManager = new ContextManager({
  maxTokens: 8000,
  compressionLevel: 'high',
  targetModel: 'claude-3',
  priorityFields: ['businessRules', 'dataStructures'],
  enableCaching: true,
  chunkingStrategy: {
    name: 'adaptive',
    maxChunkSize: 2000,
    preserveRelationships: true
  }
});
```

---

This API reference provides comprehensive documentation for programmatic usage of the ESL Framework. For CLI usage, see the [CLI Commands Reference](cli-commands.md).