/**
 * Context Manager - Main orchestrator for AI-optimized context management
 * Handles context creation, optimization, merging, and streaming for ESL documents
 */

import { performance } from 'perf_hooks';
import { ESLDocument, ProcessingContext, ESLValidationResult } from '../core/types.js';
import { SemanticChunker, ContextChunk, ChunkingStrategy } from './chunker.js';
import { ContextOptimizer, OptimizationMetrics } from './optimizer.js';
import { InheritanceContextResolver } from './inheritance.js';

export interface ContextManagerOptions {
  maxTokens?: number;
  compressionLevel?: 'low' | 'medium' | 'high';
  priorityFields?: string[];
  targetModel?: string;
  preserveMetadata?: boolean;
  enableCaching?: boolean;
  chunkingStrategy?: ChunkingStrategy;
}

export interface MergeOptions {
  preserveRelationships?: boolean;
  maxTokens?: number;
  priorityOrder?: string[];
  deduplicateContent?: boolean;
}

export interface ContextMetrics {
  creationTime: number;
  optimizationTime: number;
  tokenCount: number;
  chunkCount: number;
  compressionRatio: number;
  qualityScore: number;
}

export interface StreamingOptions {
  chunkSize: number;
  overlap: number;
  preserveRelationships: boolean;
  priorityFields: string[];
}

/**
 * Main context management orchestrator that provides intelligent context creation,
 * optimization, and delivery for AI systems processing ESL specifications
 */
export class ContextManager {
  private readonly chunker: SemanticChunker;
  private readonly optimizer: ContextOptimizer;
  private readonly inheritanceResolver: InheritanceContextResolver;
  private readonly contextCache: Map<string, ProcessingContext> = new Map();
  private readonly options: Required<ContextManagerOptions>;

  constructor(options: ContextManagerOptions = {}) {
    this.options = {
      maxTokens: options.maxTokens || 4000,
      compressionLevel: options.compressionLevel || 'medium',
      priorityFields: options.priorityFields || ['businessRules', 'dataStructures', 'governance'],
      targetModel: options.targetModel || 'gpt-4',
      preserveMetadata: options.preserveMetadata !== false,
      enableCaching: options.enableCaching !== false,
      chunkingStrategy: options.chunkingStrategy || {
        name: 'semantic',
        maxChunkSize: 2000,
        preserveRelationships: true,
        priorityFields: options.priorityFields || ['businessRules', 'dataStructures']
      }
    };

    this.chunker = new SemanticChunker();
    this.optimizer = new ContextOptimizer();
    this.inheritanceResolver = new InheritanceContextResolver();
  }

  /**
   * Creates an optimized processing context from an ESL document
   */
  async createContext(document: ESLDocument, options: Partial<ContextManagerOptions> = {}): Promise<ProcessingContext> {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(document, mergedOptions);
    
    // Check cache first
    if (mergedOptions.enableCaching && this.contextCache.has(cacheKey)) {
      const cached = this.contextCache.get(cacheKey)!;
      return { ...cached, fromCache: true };
    }

    // Create base context
    const context: ProcessingContext = {
      id: this.generateContextId(),
      document,
      filePath: '',
      basePath: process.cwd(),
      importCache: new Map(),
      validationErrors: [],
      processingOptions: { validateSchema: true },
      metadata: {
        created: new Date().toISOString(),
        tokenBudget: mergedOptions.maxTokens,
        targetModel: mergedOptions.targetModel,
        priorityFields: mergedOptions.priorityFields,
        compressionLevel: mergedOptions.compressionLevel
      },
      relationships: new Map(),
      dependencies: new Set(),
      performance: {
        parseTime: 0,
        validationTime: 0,
        optimizationTime: 0,
        totalTime: 0
      }
    };

    // Resolve inheritance if needed
    if (document.extends && document.extends.length > 0) {
      const inheritanceStartTime = performance.now();
      context.inheritanceChain = await this.inheritanceResolver.resolveInheritanceContext(document, context);
      context.performance.inheritanceTime = performance.now() - inheritanceStartTime;
    }

    // Optimize context for target model and token budget
    const optimizationStartTime = performance.now();
    const optimizedContext = await this.optimizer.optimizeContext(context, {
      maxTokens: mergedOptions.maxTokens,
      targetModel: mergedOptions.targetModel,
      compressionLevel: mergedOptions.compressionLevel,
      priorityFields: mergedOptions.priorityFields
    });
    context.performance.optimizationTime = performance.now() - optimizationStartTime;

    // Calculate final metrics
    const totalTime = performance.now() - startTime;
    optimizedContext.performance.totalTime = totalTime;
    optimizedContext.metrics = await this.calculateContextMetrics(optimizedContext);

    // Cache if enabled
    if (mergedOptions.enableCaching) {
      this.contextCache.set(cacheKey, optimizedContext);
    }

    return optimizedContext;
  }

  /**
   * Chunks a large ESL document into manageable pieces while preserving semantic relationships
   */
  async chunkDocument(document: ESLDocument, chunkSize: number = 2000): Promise<ContextChunk[]> {
    const chunks = await this.chunker.chunkByStrategy(document, {
      name: 'adaptive',
      maxChunkSize: chunkSize,
      preserveRelationships: true,
      priorityFields: this.options.priorityFields
    });

    // Validate chunk relationships
    const validationResult = await this.chunker.validateChunkRelationships(chunks);
    if (!validationResult.valid) {
      throw new Error(`Chunk validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return chunks;
  }

  /**
   * Optimizes an existing context for better AI consumption
   */
  async optimizeContext(context: ProcessingContext, targetTokens: number): Promise<ProcessingContext> {
    return this.optimizer.optimizeContext(context, {
      maxTokens: targetTokens,
      targetModel: this.options.targetModel,
      compressionLevel: this.options.compressionLevel,
      priorityFields: this.options.priorityFields
    });
  }

  /**
   * Merges multiple contexts while preserving relationships and respecting token limits
   */
  async mergeContexts(contexts: ProcessingContext[], options: MergeOptions = {}): Promise<ProcessingContext> {
    const mergeOptions: Required<MergeOptions> = {
      preserveRelationships: options.preserveRelationships !== false,
      maxTokens: options.maxTokens || this.options.maxTokens,
      priorityOrder: options.priorityOrder || this.options.priorityFields,
      deduplicateContent: options.deduplicateContent !== false
    };

    if (contexts.length === 0) {
      throw new Error('Cannot merge empty context array');
    }

    if (contexts.length === 1) {
      return contexts[0];
    }

    const startTime = performance.now();
    
    // Create merged document by combining all documents
    const mergedDocument: ESLDocument = {
      metadata: this.mergeMetadata(contexts.map(c => c.document?.metadata!)),
      businessRules: [],
      dataStructures: [],
      apiEndpoints: [],
      workflowSteps: [],
      aiContext: this.mergeAIContexts(contexts.map(c => c.document?.aiContext)),
      governance: this.mergeGovernance(contexts.map(c => c.document?.governance))
    };

    // Merge content based on priority order
    for (const field of mergeOptions.priorityOrder) {
      switch (field) {
        case 'businessRules':
          mergedDocument.businessRules = this.mergeBusinessRules(contexts, mergeOptions.deduplicateContent);
          break;
        case 'dataStructures':
          mergedDocument.dataStructures = this.mergeDataStructures(contexts, mergeOptions.deduplicateContent);
          break;
        case 'apiEndpoints':
          mergedDocument.apiEndpoints = this.mergeAPIEndpoints(contexts, mergeOptions.deduplicateContent);
          break;
        case 'workflowSteps':
          mergedDocument.workflowSteps = this.mergeWorkflowSteps(contexts, mergeOptions.deduplicateContent);
          break;
      }
    }

    // Create merged context
    const mergedContext: ProcessingContext = {
      id: this.generateContextId(),
      document: mergedDocument,
      filePath: contexts.map(c => c.filePath).join(';'),
      basePath: contexts[0]?.basePath || process.cwd(),
      importCache: new Map(),
      validationErrors: [],
      processingOptions: { validateSchema: true },
      metadata: {
        created: new Date().toISOString(),
        tokenBudget: mergeOptions.maxTokens,
        targetModel: this.options.targetModel,
        priorityFields: mergeOptions.priorityOrder,
        mergedFrom: contexts.map(c => c.id)
      },
      relationships: this.mergeRelationships(contexts, mergeOptions.preserveRelationships),
      dependencies: this.mergeDependencies(contexts),
      performance: {
        parseTime: Math.max(...contexts.map(c => c.performance?.parseTime || 0)),
        validationTime: Math.max(...contexts.map(c => c.performance?.validationTime || 0)),
        optimizationTime: 0,
        totalTime: 0,
        mergeTime: performance.now() - startTime
      }
    };

    // Optimize merged context if it exceeds token limit
    const estimatedTokens = await this.optimizer.estimateTokens(mergedDocument);
    if (estimatedTokens > mergeOptions.maxTokens) {
      return this.optimizeContext(mergedContext, mergeOptions.maxTokens);
    }

    mergedContext.performance.totalTime = performance.now() - startTime;
    mergedContext.metrics = await this.calculateContextMetrics(mergedContext);

    return mergedContext;
  }

  /**
   * Streams context chunks for processing large documents in real-time
   */
  async* streamContext(document: ESLDocument, options: Partial<StreamingOptions> = {}): AsyncGenerator<ContextChunk> {
    const streamOptions: StreamingOptions = {
      chunkSize: options.chunkSize || 2000,
      overlap: options.overlap || 200,
      preserveRelationships: options.preserveRelationships !== false,
      priorityFields: options.priorityFields || this.options.priorityFields
    };

    // Chunk document using streaming strategy
    const chunks = await this.chunker.chunkForStreaming(document, streamOptions);
    
    for (const chunk of chunks) {
      // Optimize each chunk individually
      const optimizedChunk = await this.optimizer.optimizeChunk(chunk, {
        maxTokens: streamOptions.chunkSize,
        targetModel: this.options.targetModel,
        preserveRelationships: streamOptions.preserveRelationships
      });
      
      yield optimizedChunk;
    }
  }

  /**
   * Analyzes context quality and provides optimization suggestions
   */
  async analyzeContext(context: ProcessingContext): Promise<{
    qualityScore: number;
    tokenEfficiency: number;
    relationshipPreservation: number;
    suggestions: string[];
  }> {
    const metrics = context.metrics || await this.calculateContextMetrics(context);
    
    const qualityScore = this.calculateQualityScore(context, metrics);
    const tokenEfficiency = metrics.tokenCount / this.options.maxTokens;
    const relationshipPreservation = this.calculateRelationshipScore(context);
    
    const suggestions: string[] = [];
    
    if (qualityScore < 0.7) {
      suggestions.push('Consider increasing compression level for better token efficiency');
    }
    
    if (tokenEfficiency > 0.9) {
      suggestions.push('Context is near token limit - consider chunking or further optimization');
    }
    
    if (relationshipPreservation < 0.8) {
      suggestions.push('Some semantic relationships may be lost - review chunking strategy');
    }
    
    if (metrics.compressionRatio < 0.1) {
      suggestions.push('Low compression achieved - content may already be optimized');
    }

    return {
      qualityScore,
      tokenEfficiency,
      relationshipPreservation,
      suggestions
    };
  }

  /**
   * Clears the context cache
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; memoryUsage: number } {
    return {
      size: this.contextCache.size,
      hitRate: 0, // Would track in real implementation
      memoryUsage: this.estimateCacheMemoryUsage()
    };
  }

  // Private helper methods

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(document: ESLDocument, options: ContextManagerOptions): string {
    const docHash = this.hashDocument(document);
    const optionsHash = this.hashOptions(options);
    return `${docHash}_${optionsHash}`;
  }

  private hashDocument(document: ESLDocument): string {
    // Simple hash based on document content - would use proper hashing in production
    const content = JSON.stringify(document);
    return content.length.toString(36) + content.slice(0, 100).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  }

  private hashOptions(options: ContextManagerOptions): string {
    return JSON.stringify(options).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  }

  private async calculateContextMetrics(context: ProcessingContext): Promise<ContextMetrics> {
    const tokenCount = await this.optimizer.estimateTokens(context.document);
    
    return {
      creationTime: context.performance.totalTime,
      optimizationTime: context.performance.optimizationTime,
      tokenCount,
      chunkCount: 1, // Single context
      compressionRatio: tokenCount / (tokenCount * 1.5), // Estimated original size
      qualityScore: this.calculateQualityScore(context, undefined)
    };
  }

  private calculateQualityScore(context: ProcessingContext, metrics?: ContextMetrics): number {
    // Simple quality scoring based on completeness and optimization
    let score = 0.5; // Base score
    
    // Bonus for having key fields
    if (context.document.businessRules?.length) score += 0.2;
    if (context.document.dataStructures?.length) score += 0.2;
    if (context.document.governance) score += 0.1;
    
    // Bonus for good token efficiency
    const tokenRatio = (metrics?.tokenCount || 1000) / this.options.maxTokens;
    if (tokenRatio > 0.7 && tokenRatio < 0.9) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private calculateRelationshipScore(context: ProcessingContext): number {
    // Would analyze actual relationships in production
    return context.relationships.size > 0 ? 0.8 : 0.5;
  }

  private estimateCacheMemoryUsage(): number {
    // Rough estimation - would be more precise in production
    return this.contextCache.size * 1024; // Assume 1KB average per context
  }

  // Merge helper methods

  private mergeMetadata(metadataList: any[]): any {
    return {
      version: '1.0.0',
      id: 'merged-context',
      title: 'Merged ESL Context',
      description: 'Context created by merging multiple ESL documents',
      author: 'ESL Context Manager',
      created: new Date().toISOString(),
      mergedFrom: metadataList.map(m => m?.id).filter(Boolean)
    };
  }

  private mergeAIContexts(contexts: any[]): any {
    const merged = {
      modelHints: [] as string[],
      constraints: [] as string[],
      tokenOptimization: {
        maxTokens: this.options.maxTokens,
        compressionLevel: this.options.compressionLevel,
        priorityFields: this.options.priorityFields
      }
    };

    for (const ctx of contexts) {
      if (ctx?.modelHints) merged.modelHints.push(...ctx.modelHints);
      if (ctx?.constraints) merged.constraints.push(...ctx.constraints);
    }

    // Deduplicate
    merged.modelHints = [...new Set(merged.modelHints)];
    merged.constraints = [...new Set(merged.constraints)];

    return merged;
  }

  private mergeGovernance(contexts: any[]): any {
    return {
      approvalStatus: 'pending',
      riskLevel: 'medium',
      complianceFrameworks: [...new Set(contexts.flatMap(c => c?.complianceFrameworks || []))],
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          user: 'context-manager',
          action: 'context_merge',
          details: `Merged ${contexts.length} contexts`
        }
      ]
    };
  }

  private mergeBusinessRules(contexts: ProcessingContext[], deduplicate: boolean): any[] {
    const allRules = contexts.flatMap(c => c.document?.businessRules || []);
    if (!deduplicate) return allRules;
    
    const seen = new Set<string>();
    return allRules.filter(rule => {
      if (seen.has(rule.id)) return false;
      seen.add(rule.id);
      return true;
    });
  }

  private mergeDataStructures(contexts: ProcessingContext[], deduplicate: boolean): any[] {
    const allStructures = contexts.flatMap(c => c.document?.dataStructures || []);
    if (!deduplicate) return allStructures;
    
    const seen = new Set<string>();
    return allStructures.filter(structure => {
      if (seen.has(structure.id)) return false;
      seen.add(structure.id);
      return true;
    });
  }

  private mergeAPIEndpoints(contexts: ProcessingContext[], deduplicate: boolean): any[] {
    const allEndpoints = contexts.flatMap(c => c.document?.apiEndpoints || []);
    if (!deduplicate) return allEndpoints;
    
    const seen = new Set<string>();
    return allEndpoints.filter(endpoint => {
      if (seen.has(endpoint.id)) return false;
      seen.add(endpoint.id);
      return true;
    });
  }

  private mergeWorkflowSteps(contexts: ProcessingContext[], deduplicate: boolean): any[] {
    const allSteps = contexts.flatMap(c => c.document?.workflowSteps || []);
    if (!deduplicate) return allSteps;
    
    const seen = new Set<string>();
    return allSteps.filter(step => {
      if (seen.has(step.id)) return false;
      seen.add(step.id);
      return true;
    });
  }

  private mergeRelationships(contexts: ProcessingContext[], preserve: boolean): Map<string, string[]> {
    const merged = new Map<string, string[]>();
    
    if (!preserve) return merged;
    
    for (const context of contexts) {
      if (context.relationships) {
        for (const [key, values] of context.relationships.entries()) {
          const existing = merged.get(key) || [];
          merged.set(key, [...new Set([...existing, ...values])]);
        }
      }
    }
    
    return merged;
  }

  private mergeDependencies(contexts: ProcessingContext[]): Set<string> {
    const merged = new Set<string>();
    
    for (const context of contexts) {
      if (context.dependencies) {
        for (const dep of context.dependencies) {
          merged.add(dep);
        }
      }
    }
    
    return merged;
  }
}