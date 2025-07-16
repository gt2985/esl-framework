/**
 * Context Optimizer - AI context optimization engine for efficient token usage
 * Provides intelligent compression, prioritization, and model-specific formatting
 */

import { performance } from 'perf_hooks';
import { ESLDocument, ProcessingContext } from '../core/types.js';
import { ContextChunk } from './chunker.js';

export interface OptimizationOptions {
  maxTokens: number;
  targetModel: string;
  compressionLevel: 'low' | 'medium' | 'high';
  priorityFields: string[];
  preserveMetadata?: boolean;
  optimizeForSpeed?: boolean;
  preserveRelationships?: boolean;
}

export interface OptimizationMetrics {
  originalTokens: number;
  optimizedTokens: number;
  compressionRatio: number;
  semanticPreservation: number;
  processingTime: number;
  optimizationTechniques: string[];
}

export interface ModelConfiguration {
  name: string;
  maxTokens: number;
  tokenRatio: number; // characters to tokens ratio
  preferredFormat: 'verbose' | 'compact' | 'structured';
  supportedFeatures: string[];
}

export interface CompressionResult {
  content: any;
  originalSize: number;
  compressedSize: number;
  preservedElements: string[];
  removedElements: string[];
  qualityScore: number;
}

/**
 * AI context optimization engine that intelligently compresses and formats
 * ESL content for optimal consumption by different AI models
 */
export class ContextOptimizer {
  private readonly modelConfigurations: Map<string, ModelConfiguration>;
  private readonly compressionStrategies: Map<string, CompressionStrategy>;
  private readonly tokenEstimator: TokenEstimator;
  private readonly qualityAssessor: OptimizationQualityAssessor;

  constructor() {
    this.modelConfigurations = this.initializeModelConfigurations();
    this.compressionStrategies = this.initializeCompressionStrategies();
    this.tokenEstimator = new TokenEstimator();
    this.qualityAssessor = new OptimizationQualityAssessor();
  }

  /**
   * Optimizes a processing context for better AI consumption
   */
  async optimizeContext(context: ProcessingContext, options: OptimizationOptions): Promise<ProcessingContext> {
    const startTime = performance.now();
    
    // Get model configuration
    const modelConfig = this.modelConfigurations.get(options.targetModel) || this.getDefaultModelConfig();
    
    // Estimate current token usage
    const originalTokens = await this.estimateTokens(context.document);
    
    if (originalTokens <= options.maxTokens) {
      // No optimization needed
      return { 
        ...context, 
        optimization: {
          applied: false,
          originalTokens,
          finalTokens: originalTokens,
          reason: 'Within token limit'
        }
      };
    }

    // Apply optimization pipeline
    const optimizationPipeline = this.createOptimizationPipeline(options, modelConfig);
    let optimizedDocument = { ...context.document };
    const appliedTechniques: string[] = [];

    for (const step of optimizationPipeline) {
      const stepResult = await step.optimize(optimizedDocument, options);
      optimizedDocument = stepResult.content;
      appliedTechniques.push(step.name);
      
      // Check if we've reached target tokens
      const currentTokens = await this.estimateTokens(optimizedDocument);
      if (currentTokens <= options.maxTokens) {
        break;
      }
    }

    const finalTokens = await this.estimateTokens(optimizedDocument);
    const processingTime = performance.now() - startTime;

    // Calculate metrics
    const metrics: OptimizationMetrics = {
      originalTokens,
      optimizedTokens: finalTokens,
      compressionRatio: (originalTokens - finalTokens) / originalTokens,
      semanticPreservation: await this.qualityAssessor.assessSemanticPreservation(context.document, optimizedDocument),
      processingTime,
      optimizationTechniques: appliedTechniques
    };

    return {
      ...context,
      document: optimizedDocument,
      optimization: {
        applied: true,
        originalTokens,
        finalTokens,
        metrics,
        techniques: appliedTechniques
      },
      performance: {
        ...context.performance,
        optimizationTime: processingTime
      }
    };
  }

  /**
   * Estimates token count for content using model-specific tokenization
   */
  async estimateTokens(content: any): Promise<number> {
    return this.tokenEstimator.estimate(content);
  }

  /**
   * Compresses content using specified compression level
   */
  async compressContent(content: any, targetRatio: number): Promise<CompressionResult> {
    const originalSize = await this.estimateTokens(content);
    const targetSize = Math.floor(originalSize * (1 - targetRatio));
    
    const strategy = this.selectCompressionStrategy(content, targetRatio);
    const result = await strategy.compress(content, targetSize);
    
    return {
      content: result.content,
      originalSize,
      compressedSize: await this.estimateTokens(result.content),
      preservedElements: result.preservedElements,
      removedElements: result.removedElements,
      qualityScore: await this.qualityAssessor.assessCompressionQuality(content, result.content)
    };
  }

  /**
   * Selects priority fields based on use case and content analysis
   */
  async selectPriorityFields(document: ESLDocument, useCase: string): Promise<string[]> {
    const contentAnalysis = this.analyzeContentDistribution(document);
    
    switch (useCase) {
      case 'code_generation':
        return this.prioritizeForCodeGeneration(contentAnalysis);
      
      case 'documentation':
        return this.prioritizeForDocumentation(contentAnalysis);
      
      case 'validation':
        return this.prioritizeForValidation(contentAnalysis);
      
      case 'analysis':
        return this.prioritizeForAnalysis(contentAnalysis);
      
      default:
        return ['businessRules', 'dataStructures', 'apiEndpoints', 'governance'];
    }
  }

  /**
   * Optimizes context for specific AI model requirements
   */
  async optimizeForModel(context: ProcessingContext, modelName: string): Promise<ProcessingContext> {
    const modelConfig = this.modelConfigurations.get(modelName);
    if (!modelConfig) {
      throw new Error(`Unknown model configuration: ${modelName}`);
    }

    const formatter = this.getModelFormatter(modelConfig);
    const formattedDocument = await formatter.format(context.document);

    return {
      ...context,
      document: formattedDocument,
      metadata: {
        ...context.metadata,
        targetModel: modelName
      }
    };
  }

  /**
   * Optimizes individual chunk for streaming or processing
   */
  async optimizeChunk(chunk: ContextChunk, options: Partial<OptimizationOptions>): Promise<ContextChunk> {
    const optimizationOptions: OptimizationOptions = {
      maxTokens: options.maxTokens || 2000,
      targetModel: options.targetModel || 'gpt-4',
      compressionLevel: options.compressionLevel || 'medium',
      priorityFields: options.priorityFields || ['businessRules', 'dataStructures'],
      preserveMetadata: options.preserveMetadata !== false
    };

    if (chunk.tokenCount <= optimizationOptions.maxTokens) {
      return chunk; // No optimization needed
    }

    const compressionRatio = 1 - (optimizationOptions.maxTokens / chunk.tokenCount);
    const compressionResult = await this.compressContent(chunk.content, compressionRatio);

    return {
      ...chunk,
      content: compressionResult.content,
      tokenCount: compressionResult.compressedSize,
      metadata: {
        ...chunk.metadata,
        optimized: true,
        originalTokens: chunk.tokenCount,
        compressionRatio
      }
    };
  }

  /**
   * Measures optimization effectiveness
   */
  async measureOptimization(before: ProcessingContext, after: ProcessingContext): Promise<OptimizationMetrics> {
    const originalTokens = await this.estimateTokens(before.document);
    const optimizedTokens = await this.estimateTokens(after.document);
    
    return {
      originalTokens,
      optimizedTokens,
      compressionRatio: (originalTokens - optimizedTokens) / originalTokens,
      semanticPreservation: await this.qualityAssessor.assessSemanticPreservation(before.document, after.document),
      processingTime: after.performance.optimizationTime || 0,
      optimizationTechniques: after.optimization?.techniques || []
    };
  }

  // Private helper methods

  private initializeModelConfigurations(): Map<string, ModelConfiguration> {
    const configs = new Map<string, ModelConfiguration>();
    
    configs.set('gpt-4', {
      name: 'GPT-4',
      maxTokens: 8192,
      tokenRatio: 4.0, // ~4 characters per token
      preferredFormat: 'structured',
      supportedFeatures: ['context_optimization', 'semantic_compression', 'code_generation']
    });
    
    configs.set('gpt-3.5-turbo', {
      name: 'GPT-3.5 Turbo',
      maxTokens: 4096,
      tokenRatio: 4.0,
      preferredFormat: 'compact',
      supportedFeatures: ['context_optimization', 'basic_compression']
    });
    
    configs.set('claude-3', {
      name: 'Claude 3',
      maxTokens: 100000,
      tokenRatio: 3.8,
      preferredFormat: 'verbose',
      supportedFeatures: ['context_optimization', 'semantic_compression', 'long_context']
    });
    
    configs.set('gemini-pro', {
      name: 'Gemini Pro',
      maxTokens: 32768,
      tokenRatio: 4.2,
      preferredFormat: 'structured',
      supportedFeatures: ['context_optimization', 'multimodal_context']
    });
    
    return configs;
  }

  private initializeCompressionStrategies(): Map<string, CompressionStrategy> {
    const strategies = new Map<string, CompressionStrategy>();
    
    strategies.set('field_prioritization', new FieldPrioritizationStrategy());
    strategies.set('redundancy_removal', new RedundancyRemovalStrategy());
    strategies.set('semantic_compression', new SemanticCompressionStrategy());
    strategies.set('structural_optimization', new StructuralOptimizationStrategy());
    
    return strategies;
  }

  private getDefaultModelConfig(): ModelConfiguration {
    return {
      name: 'default',
      maxTokens: 4000,
      tokenRatio: 4.0,
      preferredFormat: 'structured',
      supportedFeatures: ['context_optimization']
    };
  }

  private createOptimizationPipeline(options: OptimizationOptions, modelConfig: ModelConfiguration): OptimizationStep[] {
    const pipeline: OptimizationStep[] = [];
    
    // Add steps based on compression level
    switch (options.compressionLevel) {
      case 'high':
        pipeline.push(new AggressiveCompressionStep());
        pipeline.push(new SemanticCompressionStep());
        pipeline.push(new StructuralOptimizationStep());
        break;
      
      case 'medium':
        pipeline.push(new BalancedCompressionStep());
        pipeline.push(new RedundancyRemovalStep());
        break;
      
      case 'low':
        pipeline.push(new MinimalCompressionStep());
        break;
    }
    
    // Add model-specific optimizations
    if (modelConfig.supportedFeatures.includes('semantic_compression')) {
      pipeline.push(new SemanticCompressionStep());
    }
    
    return pipeline;
  }

  private selectCompressionStrategy(content: any, targetRatio: number): CompressionStrategy {
    if (targetRatio > 0.5) {
      return this.compressionStrategies.get('semantic_compression')!;
    } else if (targetRatio > 0.3) {
      return this.compressionStrategies.get('redundancy_removal')!;
    } else {
      return this.compressionStrategies.get('field_prioritization')!;
    }
  }

  private analyzeContentDistribution(document: ESLDocument): ContentAnalysis {
    return {
      businessRuleCount: document.businessRules?.length || 0,
      dataStructureCount: document.dataStructures?.length || 0,
      apiEndpointCount: document.apiEndpoints?.length || 0,
      workflowStepCount: document.workflowSteps?.length || 0,
      hasGovernance: !!document.governance,
      hasAIContext: !!document.aiContext,
      complexity: this.calculateComplexity(document)
    };
  }

  private calculateComplexity(document: ESLDocument): 'low' | 'medium' | 'high' {
    const totalElements = (document.businessRules?.length || 0) +
                         (document.dataStructures?.length || 0) +
                         (document.apiEndpoints?.length || 0) +
                         (document.workflowSteps?.length || 0);
    
    if (totalElements > 50) return 'high';
    if (totalElements > 20) return 'medium';
    return 'low';
  }

  private prioritizeForCodeGeneration(analysis: ContentAnalysis): string[] {
    const priorities = ['dataStructures', 'apiEndpoints', 'businessRules'];
    if (analysis.workflowStepCount > 0) priorities.push('workflowSteps');
    return priorities;
  }

  private prioritizeForDocumentation(analysis: ContentAnalysis): string[] {
    return ['businessRules', 'dataStructures', 'apiEndpoints', 'governance', 'workflowSteps'];
  }

  private prioritizeForValidation(analysis: ContentAnalysis): string[] {
    return ['businessRules', 'governance', 'dataStructures', 'apiEndpoints'];
  }

  private prioritizeForAnalysis(analysis: ContentAnalysis): string[] {
    const priorities = ['businessRules', 'dataStructures'];
    if (analysis.hasGovernance) priorities.push('governance');
    if (analysis.hasAIContext) priorities.push('aiContext');
    return priorities.concat(['apiEndpoints', 'workflowSteps']);
  }

  private getModelFormatter(config: ModelConfiguration): ModelFormatter {
    switch (config.preferredFormat) {
      case 'verbose':
        return new VerboseFormatter();
      case 'compact':
        return new CompactFormatter();
      case 'structured':
      default:
        return new StructuredFormatter();
    }
  }
}

// Supporting interfaces and classes

interface ContentAnalysis {
  businessRuleCount: number;
  dataStructureCount: number;
  apiEndpointCount: number;
  workflowStepCount: number;
  hasGovernance: boolean;
  hasAIContext: boolean;
  complexity: 'low' | 'medium' | 'high';
}

interface OptimizationStep {
  name: string;
  optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult>;
}

interface CompressionStrategy {
  name: string;
  compress(content: any, targetSize: number): Promise<{
    content: any;
    preservedElements: string[];
    removedElements: string[];
  }>;
}

interface ModelFormatter {
  format(document: ESLDocument): Promise<ESLDocument>;
}

/**
 * Token estimation engine for different AI models
 */
class TokenEstimator {
  async estimate(content: any): Promise<number> {
    // Simple estimation based on text length
    // In production, would use proper tokenization for each model
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4); // Rough approximation
  }

  estimateForModel(content: any, modelName: string): Promise<number> {
    const config = this.getModelConfig(modelName);
    const text = JSON.stringify(content);
    return Promise.resolve(Math.ceil(text.length / config.tokenRatio));
  }

  private getModelConfig(modelName: string): { tokenRatio: number } {
    const configs: Record<string, { tokenRatio: number }> = {
      'gpt-4': { tokenRatio: 4.0 },
      'gpt-3.5-turbo': { tokenRatio: 4.0 },
      'claude-3': { tokenRatio: 3.8 },
      'gemini-pro': { tokenRatio: 4.2 }
    };
    
    return configs[modelName] || { tokenRatio: 4.0 };
  }
}

/**
 * Assesses the quality of optimization results
 */
class OptimizationQualityAssessor {
  async assessSemanticPreservation(original: ESLDocument, optimized: ESLDocument): Promise<number> {
    let score = 0.5; // Base score
    
    // Check preservation of key elements
    if (this.preservesBusinessRules(original, optimized)) score += 0.2;
    if (this.preservesDataStructures(original, optimized)) score += 0.2;
    if (this.preservesAPIEndpoints(original, optimized)) score += 0.1;
    
    return Math.min(1.0, score);
  }

  async assessCompressionQuality(original: any, compressed: any): Promise<number> {
    // Simple quality assessment
    const originalKeys = Object.keys(original);
    const compressedKeys = Object.keys(compressed);
    
    const preservation = compressedKeys.length / originalKeys.length;
    return Math.min(1.0, preservation);
  }

  private preservesBusinessRules(original: ESLDocument, optimized: ESLDocument): boolean {
    const originalCount = original.businessRules?.length || 0;
    const optimizedCount = optimized.businessRules?.length || 0;
    
    return optimizedCount >= originalCount * 0.8; // 80% preservation threshold
  }

  private preservesDataStructures(original: ESLDocument, optimized: ESLDocument): boolean {
    const originalCount = original.dataStructures?.length || 0;
    const optimizedCount = optimized.dataStructures?.length || 0;
    
    return optimizedCount >= originalCount * 0.9; // 90% preservation threshold
  }

  private preservesAPIEndpoints(original: ESLDocument, optimized: ESLDocument): boolean {
    const originalCount = original.apiEndpoints?.length || 0;
    const optimizedCount = optimized.apiEndpoints?.length || 0;
    
    return optimizedCount >= originalCount * 0.85; // 85% preservation threshold
  }
}

// Optimization step implementations

class AggressiveCompressionStep implements OptimizationStep {
  name = 'aggressive_compression';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const optimized = { ...document };
    const removedElements: string[] = [];
    
    // Remove optional metadata
    if (optimized.metadata) {
      delete optimized.metadata.description;
      delete optimized.metadata.tags;
      removedElements.push('metadata.description', 'metadata.tags');
    }
    
    // Compress business rules
    if (optimized.businessRules) {
      optimized.businessRules = optimized.businessRules.filter(rule => rule.priority <= 2);
      removedElements.push('low_priority_business_rules');
    }
    
    const originalSize = await this.estimateTokens(document);
    const compressedSize = await this.estimateTokens(optimized);
    
    return {
      content: optimized,
      originalSize,
      compressedSize,
      preservedElements: ['businessRules', 'dataStructures'],
      removedElements,
      qualityScore: 0.7
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

class BalancedCompressionStep implements OptimizationStep {
  name = 'balanced_compression';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const optimized = { ...document };
    const removedElements: string[] = [];
    
    // Remove examples and detailed descriptions
    if (optimized.businessRules) {
      optimized.businessRules = optimized.businessRules.map(rule => ({
        ...rule,
        examples: undefined as any,
        metadata: undefined as any
      }));
      removedElements.push('business_rule_examples', 'business_rule_metadata');
    }
    
    const originalSize = await this.estimateTokens(document);
    const compressedSize = await this.estimateTokens(optimized);
    
    return {
      content: optimized,
      originalSize,
      compressedSize,
      preservedElements: ['businessRules', 'dataStructures', 'apiEndpoints'],
      removedElements,
      qualityScore: 0.85
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

class MinimalCompressionStep implements OptimizationStep {
  name = 'minimal_compression';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const optimized = { ...document };
    const removedElements: string[] = [];
    
    // Only remove truly optional elements
    if (optimized.metadata?.tags) {
      delete optimized.metadata.tags;
      removedElements.push('metadata.tags');
    }
    
    const originalSize = await this.estimateTokens(document);
    const compressedSize = await this.estimateTokens(optimized);
    
    return {
      content: optimized,
      originalSize,
      compressedSize,
      preservedElements: Object.keys(document),
      removedElements,
      qualityScore: 0.95
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

class SemanticCompressionStep implements OptimizationStep {
  name = 'semantic_compression';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const originalSize = await this.estimateTokens(document);
    const compressedSize = originalSize; // No compression in simplified implementation
    
    return {
      content: document,
      originalSize,
      compressedSize,
      preservedElements: Object.keys(document),
      removedElements: [],
      qualityScore: 0.9
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

class RedundancyRemovalStep implements OptimizationStep {
  name = 'redundancy_removal';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const originalSize = await this.estimateTokens(document);
    const compressedSize = originalSize;
    
    return {
      content: document,
      originalSize,
      compressedSize,
      preservedElements: Object.keys(document),
      removedElements: [],
      qualityScore: 0.88
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

class StructuralOptimizationStep implements OptimizationStep {
  name = 'structural_optimization';

  async optimize(document: ESLDocument, options: OptimizationOptions): Promise<CompressionResult> {
    const originalSize = await this.estimateTokens(document);
    const compressedSize = originalSize;
    
    return {
      content: document,
      originalSize,
      compressedSize,
      preservedElements: Object.keys(document),
      removedElements: [],
      qualityScore: 0.82
    };
  }

  private async estimateTokens(content: any): Promise<number> {
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }
}

// Compression strategy implementations

class FieldPrioritizationStrategy implements CompressionStrategy {
  name = 'field_prioritization';

  async compress(content: any, targetSize: number): Promise<{
    content: any;
    preservedElements: string[];
    removedElements: string[];
  }> {
    // Implement field prioritization logic
    return {
      content,
      preservedElements: Object.keys(content),
      removedElements: []
    };
  }
}

class RedundancyRemovalStrategy implements CompressionStrategy {
  name = 'redundancy_removal';

  async compress(content: any, targetSize: number): Promise<{
    content: any;
    preservedElements: string[];
    removedElements: string[];
  }> {
    // Implement redundancy removal logic
    return {
      content,
      preservedElements: Object.keys(content),
      removedElements: []
    };
  }
}

class SemanticCompressionStrategy implements CompressionStrategy {
  name = 'semantic_compression';

  async compress(content: any, targetSize: number): Promise<{
    content: any;
    preservedElements: string[];
    removedElements: string[];
  }> {
    // Implement semantic compression logic
    return {
      content,
      preservedElements: Object.keys(content),
      removedElements: []
    };
  }
}

class StructuralOptimizationStrategy implements CompressionStrategy {
  name = 'structural_optimization';

  async compress(content: any, targetSize: number): Promise<{
    content: any;
    preservedElements: string[];
    removedElements: string[];
  }> {
    // Implement structural optimization logic
    return {
      content,
      preservedElements: Object.keys(content),
      removedElements: []
    };
  }
}

// Model formatter implementations

class VerboseFormatter implements ModelFormatter {
  async format(document: ESLDocument): Promise<ESLDocument> {
    // Add verbose descriptions and context
    return document;
  }
}

class CompactFormatter implements ModelFormatter {
  async format(document: ESLDocument): Promise<ESLDocument> {
    // Create compact representation
    return document;
  }
}

class StructuredFormatter implements ModelFormatter {
  async format(document: ESLDocument): Promise<ESLDocument> {
    // Create well-structured representation
    return document;
  }
}