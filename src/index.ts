export * from './core/types.js';
export * from './core/constants.js';
export * from './core/utils.js';
export * from './core/parser.js';
export * from './core/inheritance.js';
export * from './validation/validator.js';
export { ValidationRule as ESLValidationRule, ValidationRuleEngine } from './validation/rules.js';
export * from './validation/semantic.js';
export * from './context/manager.js';
export * from './context/chunker.js';
export * from './context/optimizer.js';
export * from './context/inheritance.js';

import { 
  ESLDocument, 
  ESLValidationResult, 
  ESLProcessingOptions,
  ProcessingContext 
} from './core/types.js';
import { 
  readFile, 
  parseYAML, 
  createValidationResult, 
  createProcessingContext,
  ESLError,
  mergeValidationResults 
} from './core/utils.js';
import { DEFAULT_PROCESSING_OPTIONS } from './core/constants.js';
import { ESLParser } from './core/parser.js';
import { InheritanceResolver } from './core/inheritance.js';
import { ESLValidator } from './validation/validator.js';
import { SemanticAnalyzer } from './validation/semantic.js';

export class ESLFramework {
  private readonly options: ESLProcessingOptions;
  private readonly parser: ESLParser;
  private readonly validator: ESLValidator;
  private readonly inheritanceResolver: InheritanceResolver;
  private readonly semanticAnalyzer: SemanticAnalyzer;

  constructor(options: Partial<ESLProcessingOptions> = {}) {
    this.options = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
    this.parser = new ESLParser({
      strictMode: this.options.validateSchema || false,
      validateOnParse: true
    });
    this.validator = new ESLValidator({
      strictMode: this.options.validateSchema || false,
      validateReferences: true,
      validateBusinessLogic: true,
      validateAIContext: this.options.optimizeForAI || false,
      validateGovernance: true
    });
    this.inheritanceResolver = new InheritanceResolver({
      validateInheritance: true
    });
    this.semanticAnalyzer = new SemanticAnalyzer({
      analyzeBusinessAlignment: true,
      analyzeTechnicalConsistency: true,
      analyzeAIOptimization: this.options.optimizeForAI || false,
      analyzeGovernanceCompliance: true
    });
  }

  async parseFile(filePath: string): Promise<ESLValidationResult> {
    try {
      const content = await readFile(filePath);
      return this.parseContent(content, filePath);
    } catch (error) {
      if (error instanceof ESLError) {
        return createValidationResult(false, [{
          message: error.message,
          line: error.line || 0,
          column: error.column || 0,
          code: error.code,
          severity: 'error'
        }]);
      }
      
      return createValidationResult(false, [{
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        line: 0,
        column: 0,
        code: 'UNEXPECTED_ERROR',
        severity: 'error'
      }]);
    }
  }

  async parseContent(content: string, filePath?: string): Promise<ESLValidationResult> {
    const parseResult = await this.parser.parseDocument(content, filePath);
    
    if (!parseResult.valid || !parseResult.document) {
      return parseResult;
    }

    if (this.options.validateSchema) {
      const validationResult = await this.validator.validateDocument(parseResult.document);
      return mergeValidationResults(parseResult, validationResult);
    }

    return parseResult;
  }

  async validateDocument(document: ESLDocument, context?: ProcessingContext): Promise<ESLValidationResult> {
    return this.validator.validateDocument(document, context);
  }

  createProcessingContext(basePath: string): ProcessingContext {
    return createProcessingContext(basePath);
  }

  async processDocument(
    document: ESLDocument, 
    context?: ProcessingContext
  ): Promise<ESLValidationResult> {
    const processingContext = context || this.createProcessingContext(process.cwd());
    
    try {
      let processedDocument = { ...document };
      
      if (this.options.resolveInheritance && document.extends) {
        processedDocument = await this.resolveInheritance(processedDocument, processingContext);
      }
      
      if (this.options.processImports && document.imports) {
        processedDocument = await this.processImports(processedDocument, processingContext);
      }
      
      if (this.options.enableSemanticAnalysis) {
        return this.performSemanticAnalysis(processedDocument, processingContext);
      }
      
      return createValidationResult(true, [], [], processedDocument);
    } catch (error) {
      return createValidationResult(false, [{
        message: `Processing error: ${error instanceof Error ? error.message : String(error)}`,
        line: 0,
        column: 0,
        code: 'PROCESSING_ERROR',
        severity: 'error'
      }]);
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

  private async resolveInheritance(
    document: ESLDocument, 
    context: ProcessingContext
  ): Promise<ESLDocument> {
    const result = await this.inheritanceResolver.resolveInheritance(document, context);
    if (result.valid && result.document) {
      return result.document;
    }
    throw new ESLError('Inheritance resolution failed', 'INHERITANCE_FAILED');
  }

  private async processImports(
    document: ESLDocument, 
    context: ProcessingContext
  ): Promise<ESLDocument> {
    // TODO: Implement import processing in future session
    return document;
  }

  private async performSemanticAnalysis(
    document: ESLDocument, 
    context: ProcessingContext
  ): Promise<ESLValidationResult> {
    return this.semanticAnalyzer.analyzeDocument(document, context);
  }
}

export default ESLFramework;
