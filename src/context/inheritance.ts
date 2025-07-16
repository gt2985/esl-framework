/**
 * Inheritance Context Resolver - Manages context creation for documents with inheritance chains
 * Handles multi-level inheritance, circular references, and context propagation
 */

import { ESLDocument, ProcessingContext, ImportStatement } from '../core/types.js';
import { InheritanceResolver } from '../core/inheritance.js';

export interface InheritanceContext {
  document: ESLDocument;
  level: number;
  parent?: InheritanceContext;
  children: InheritanceContext[];
  contextWeight: number;
  propagatedElements: string[];
}

export interface ContextInheritanceOptions {
  maxDepth: number;
  includeParentContext: boolean;
  propagateOptimizations: boolean;
  preserveInheritanceMetadata: boolean;
  contextWeighting: 'linear' | 'exponential' | 'custom';
}

export interface InheritanceAnalysis {
  totalDepth: number;
  documentCount: number;
  circularReferences: string[];
  inheritanceTree: InheritanceTreeNode[];
  complexityScore: number;
  recommendedChunking: string;
}

export interface InheritanceTreeNode {
  documentId: string;
  level: number;
  children: InheritanceTreeNode[];
  contextSize: number;
  dependencies: string[];
}

/**
 * Specialized context resolver that handles inheritance relationships
 * and creates optimized contexts for documents with parent-child relationships
 */
export class InheritanceContextResolver {
  private readonly inheritanceResolver: InheritanceResolver;
  private readonly contextCache: Map<string, InheritanceContext> = new Map();

  constructor() {
    this.inheritanceResolver = new InheritanceResolver({
      maxDepth: 10,
      allowCircular: false,
      mergeStrategy: 'merge',
      validateInheritance: true
    });
  }

  /**
   * Resolves inheritance context for a document with extends relationships
   */
  async resolveInheritanceContext(
    document: ESLDocument, 
    baseContext: ProcessingContext,
    options: Partial<ContextInheritanceOptions> = {}
  ): Promise<InheritanceContext> {
    const resolverOptions: ContextInheritanceOptions = {
      maxDepth: options.maxDepth || 5,
      includeParentContext: options.includeParentContext !== false,
      propagateOptimizations: options.propagateOptimizations !== false,
      preserveInheritanceMetadata: options.preserveInheritanceMetadata !== false,
      contextWeighting: options.contextWeighting || 'exponential'
    };

    // Check cache first
    const cacheKey = this.generateInheritanceCacheKey(document, resolverOptions);
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    // Build inheritance hierarchy
    const hierarchy = await this.buildInheritanceHierarchy(document, resolverOptions);
    
    // Create context for each document in hierarchy
    const rootContext = await this.createInheritanceContext(hierarchy, 0, undefined, resolverOptions);
    
    // Cache the result
    this.contextCache.set(cacheKey, rootContext);
    
    return rootContext;
  }

  /**
   * Analyzes inheritance structure to provide optimization recommendations
   */
  async analyzeInheritanceStructure(document: ESLDocument): Promise<InheritanceAnalysis> {
    const hierarchy = await this.buildInheritanceHierarchy(document, {
      maxDepth: 10,
      includeParentContext: true,
      propagateOptimizations: false,
      preserveInheritanceMetadata: true,
      contextWeighting: 'linear'
    });

    const analysis = this.analyzeHierarchy(hierarchy);
    const complexityScore = this.calculateComplexityScore(analysis);
    
    return {
      totalDepth: analysis.maxDepth,
      documentCount: analysis.documentCount,
      circularReferences: analysis.circularRefs,
      inheritanceTree: analysis.tree,
      complexityScore,
      recommendedChunking: this.recommendChunkingStrategy(complexityScore)
    };
  }

  /**
   * Creates optimized context chunks that preserve inheritance relationships
   */
  async createInheritanceAwareChunks(
    rootContext: InheritanceContext,
    chunkSize: number = 2000
  ): Promise<InheritanceContextChunk[]> {
    const chunks: InheritanceContextChunk[] = [];
    
    // Flatten inheritance hierarchy while preserving relationships
    const flattenedContexts = this.flattenInheritanceTree(rootContext);
    
    // Group contexts by inheritance level and relationships
    const groupedContexts = this.groupContextsByRelationship(flattenedContexts);
    
    for (const group of groupedContexts) {
      const chunk = await this.createRelationshipChunk(group, chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Propagates context optimizations through inheritance chain
   */
  async propagateOptimizations(
    rootContext: InheritanceContext,
    optimizations: ContextOptimization[]
  ): Promise<InheritanceContext> {
    const optimizedContext = { ...rootContext };
    
    // Apply optimizations to root document
    optimizedContext.document = await this.applyOptimizations(
      optimizedContext.document, 
      optimizations
    );
    
    // Propagate to children with weight adjustments
    optimizedContext.children = await Promise.all(
      optimizedContext.children.map(async (child) => {
        const childOptimizations = this.adjustOptimizationsForLevel(
          optimizations, 
          child.level
        );
        return this.propagateOptimizations(child, childOptimizations);
      })
    );
    
    return optimizedContext;
  }

  /**
   * Merges multiple inheritance contexts while preserving relationships
   */
  async mergeInheritanceContexts(
    contexts: InheritanceContext[],
    preserveHierarchy: boolean = true
  ): Promise<InheritanceContext> {
    if (contexts.length === 0) {
      throw new Error('Cannot merge empty inheritance contexts');
    }
    
    if (contexts.length === 1) {
      return contexts[0];
    }
    
    // Find common ancestor or create virtual root
    const mergedRoot = await this.findOrCreateCommonRoot(contexts);
    
    if (preserveHierarchy) {
      // Preserve inheritance structure
      return this.mergePreservingHierarchy(contexts, mergedRoot);
    } else {
      // Flatten and merge
      return this.mergeFlattened(contexts, mergedRoot);
    }
  }

  /**
   * Validates inheritance context integrity
   */
  async validateInheritanceContext(context: InheritanceContext): Promise<{
    valid: boolean;
    issues: InheritanceIssue[];
    suggestions: string[];
  }> {
    const issues: InheritanceIssue[] = [];
    const suggestions: string[] = [];
    
    // Check for circular references
    const circularRefs = this.detectCircularReferences(context);
    if (circularRefs.length > 0) {
      issues.push({
        type: 'circular_reference',
        severity: 'error',
        message: `Circular references detected: ${circularRefs.join(', ')}`,
        affectedDocuments: circularRefs
      });
    }
    
    // Check inheritance depth
    const maxDepth = this.calculateMaxDepth(context);
    if (maxDepth > 8) {
      issues.push({
        type: 'excessive_depth',
        severity: 'warning',
        message: `Inheritance depth (${maxDepth}) exceeds recommended maximum (8)`,
        affectedDocuments: [context.document.metadata?.id || 'unknown']
      });
      suggestions.push('Consider flattening inheritance hierarchy or using composition');
    }
    
    // Check context size distribution
    const contextSizes = this.analyzeContextSizes(context);
    if (contextSizes.variance > 0.8) {
      issues.push({
        type: 'unbalanced_contexts',
        severity: 'warning',
        message: 'Inheritance contexts have significant size imbalance',
        affectedDocuments: contextSizes.outliers
      });
      suggestions.push('Consider rebalancing inheritance hierarchy');
    }
    
    // Check for orphaned dependencies
    const orphanedDeps = this.findOrphanedDependencies(context);
    if (orphanedDeps.length > 0) {
      issues.push({
        type: 'orphaned_dependencies',
        severity: 'error',
        message: `Orphaned dependencies found: ${orphanedDeps.join(', ')}`,
        affectedDocuments: orphanedDeps
      });
    }
    
    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      suggestions
    };
  }

  // Private helper methods

  private async buildInheritanceHierarchy(
    document: ESLDocument,
    options: ContextInheritanceOptions
  ): Promise<InheritanceHierarchy> {
    const hierarchy: InheritanceHierarchy = {
      root: document,
      levels: new Map(),
      dependencies: new Map(),
      circularRefs: []
    };
    
    // Process extends statements
    if (document.extends && document.extends.length > 0) {
      await this.processExtendsStatements(document, hierarchy, 0, options);
    }
    
    return hierarchy;
  }

  private async processExtendsStatements(
    document: ESLDocument,
    hierarchy: InheritanceHierarchy,
    level: number,
    options: ContextInheritanceOptions
  ): Promise<void> {
    if (level >= options.maxDepth) {
      return; // Prevent excessive depth
    }
    
    const currentLevel = hierarchy.levels.get(level) || [];
    currentLevel.push(document);
    hierarchy.levels.set(level, currentLevel);
    
    if (document.extends) {
      for (const extendStatement of document.extends) {
        // Load parent document (simplified - would use actual file loading)
        const parentDocument = await this.loadParentDocument(typeof extendStatement === 'string' ? extendStatement : (extendStatement as any).from || '');
        
        if (parentDocument) {
          // Check for circular reference
          if (this.wouldCreateCircularReference(document, parentDocument, hierarchy)) {
            hierarchy.circularRefs.push(`${document.metadata?.id} -> ${parentDocument.metadata?.id}`);
            continue;
          }
          
          // Recursively process parent
          await this.processExtendsStatements(parentDocument, hierarchy, level + 1, options);
        }
      }
    }
  }

  private async loadParentDocument(filePath: string): Promise<ESLDocument | null> {
    // Simplified implementation - would load actual documents
    return null;
  }

  private wouldCreateCircularReference(
    child: ESLDocument,
    parent: ESLDocument,
    hierarchy: InheritanceHierarchy
  ): boolean {
    // Simplified circular reference detection
    const childId = child.metadata?.id;
    const parentId = parent.metadata?.id;
    
    if (!childId || !parentId) return false;
    
    // Check if parent already depends on child
    const parentDeps = hierarchy.dependencies.get(parentId) || [];
    return parentDeps.includes(childId);
  }

  private async createInheritanceContext(
    hierarchy: InheritanceHierarchy,
    level: number,
    parent: InheritanceContext | undefined,
    options: ContextInheritanceOptions
  ): Promise<InheritanceContext> {
    const documentsAtLevel = hierarchy.levels.get(level) || [];
    const document = documentsAtLevel[0]; // Simplified - take first document
    
    if (!document) {
      throw new Error(`No document found at inheritance level ${level}`);
    }
    
    const contextWeight = this.calculateContextWeight(level, options.contextWeighting);
    const propagatedElements = this.calculatePropagatedElements(document, parent);
    
    const context: InheritanceContext = {
      document,
      level,
      parent,
      children: [],
      contextWeight,
      propagatedElements
    };
    
    // Process children
    if (level > 0 && hierarchy.levels.has(level - 1)) {
      const childPromises = (hierarchy.levels.get(level - 1) || []).map(childDoc =>
        this.createInheritanceContext(hierarchy, level - 1, context, options)
      );
      context.children = await Promise.all(childPromises);
    }
    
    return context;
  }

  private calculateContextWeight(level: number, weighting: 'linear' | 'exponential' | 'custom'): number {
    switch (weighting) {
      case 'linear':
        return Math.max(0.1, 1.0 - (level * 0.2));
      
      case 'exponential':
        return Math.max(0.1, Math.pow(0.8, level));
      
      case 'custom':
        // Custom weighting logic
        return Math.max(0.1, 1.0 / (level + 1));
      
      default:
        return 1.0;
    }
  }

  private calculatePropagatedElements(document: ESLDocument, parent?: InheritanceContext): string[] {
    const elements: string[] = [];
    
    if (parent) {
      // Elements that should be propagated from parent
      if (parent.document.businessRules) {
        elements.push(...parent.document.businessRules.map(r => r.id));
      }
      if (parent.document.dataStructures) {
        elements.push(...parent.document.dataStructures.map(d => d.id));
      }
    }
    
    return elements;
  }

  private generateInheritanceCacheKey(document: ESLDocument, options: ContextInheritanceOptions): string {
    const docId = document.metadata?.id || 'unknown';
    const optionsHash = JSON.stringify(options).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    return `${docId}_${optionsHash}`;
  }

  private analyzeHierarchy(hierarchy: InheritanceHierarchy): {
    maxDepth: number;
    documentCount: number;
    circularRefs: string[];
    tree: InheritanceTreeNode[];
  } {
    const maxDepth = Math.max(...hierarchy.levels.keys());
    const documentCount = Array.from(hierarchy.levels.values()).reduce((total, docs) => total + docs.length, 0);
    
    const tree: InheritanceTreeNode[] = [];
    // Build tree representation (simplified)
    
    return {
      maxDepth,
      documentCount,
      circularRefs: hierarchy.circularRefs,
      tree
    };
  }

  private calculateComplexityScore(analysis: { maxDepth: number; documentCount: number; circularRefs: string[] }): number {
    let score = 0;
    
    // Depth penalty
    score += analysis.maxDepth * 0.2;
    
    // Document count penalty
    score += analysis.documentCount * 0.1;
    
    // Circular reference penalty
    score += analysis.circularRefs.length * 0.5;
    
    return Math.min(1.0, score);
  }

  private recommendChunkingStrategy(complexityScore: number): string {
    if (complexityScore > 0.8) {
      return 'aggressive_chunking_with_inheritance_preservation';
    } else if (complexityScore > 0.5) {
      return 'balanced_chunking_with_relationship_awareness';
    } else {
      return 'minimal_chunking_preserving_hierarchy';
    }
  }

  private flattenInheritanceTree(rootContext: InheritanceContext): InheritanceContext[] {
    const flattened: InheritanceContext[] = [rootContext];
    
    for (const child of rootContext.children) {
      flattened.push(...this.flattenInheritanceTree(child));
    }
    
    return flattened;
  }

  private groupContextsByRelationship(contexts: InheritanceContext[]): InheritanceContext[][] {
    // Group contexts that should be chunked together
    const groups: InheritanceContext[][] = [];
    
    // Group by inheritance level
    const levelGroups = new Map<number, InheritanceContext[]>();
    for (const context of contexts) {
      const level = context.level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(context);
    }
    
    // Convert to array
    groups.push(...Array.from(levelGroups.values()));
    
    return groups;
  }

  private async createRelationshipChunk(
    contexts: InheritanceContext[], 
    chunkSize: number
  ): Promise<InheritanceContextChunk> {
    const chunkId = `inh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Merge documents from related contexts
    const mergedContent = this.mergeContextDocuments(contexts);
    
    return {
      id: chunkId,
      contexts,
      mergedContent,
      inheritanceLevel: contexts[0]?.level || 0,
      relationships: this.extractRelationships(contexts),
      tokenCount: await this.estimateTokenCount(mergedContent),
      metadata: {
        createdAt: new Date().toISOString(),
        contextCount: contexts.length,
        inheritanceDepth: Math.max(...contexts.map(c => c.level)),
        preservedRelationships: true
      }
    };
  }

  private mergeContextDocuments(contexts: InheritanceContext[]): any {
    // Simple merge implementation
    const merged = {
      metadata: {
        id: `merged_${contexts.map(c => c.document.metadata?.id).join('_')}`,
        title: 'Merged Inheritance Context',
        description: `Merged context from ${contexts.length} inheritance levels`
      },
      businessRules: [] as any[],
      dataStructures: [] as any[],
      apiEndpoints: [] as any[],
      workflowSteps: [] as any[]
    };
    
    for (const context of contexts) {
      const doc = context.document;
      if (doc.businessRules) merged.businessRules.push(...doc.businessRules);
      if (doc.dataStructures) merged.dataStructures.push(...doc.dataStructures);
      if (doc.apiEndpoints) merged.apiEndpoints.push(...doc.apiEndpoints);
      if (doc.workflowSteps) merged.workflowSteps.push(...doc.workflowSteps);
    }
    
    return merged;
  }

  private extractRelationships(contexts: InheritanceContext[]): string[] {
    const relationships: string[] = [];
    
    for (const context of contexts) {
      relationships.push(...context.propagatedElements);
      
      if (context.parent) {
        relationships.push(`inherits_from:${context.parent.document.metadata?.id}`);
      }
      
      for (const child of context.children) {
        relationships.push(`parent_of:${child.document.metadata?.id}`);
      }
    }
    
    return [...new Set(relationships)];
  }

  private async estimateTokenCount(content: any): Promise<number> {
    // Simple token estimation
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }

  private async applyOptimizations(document: ESLDocument, optimizations: ContextOptimization[]): Promise<ESLDocument> {
    // Apply optimizations to document
    return document; // Simplified
  }

  private adjustOptimizationsForLevel(optimizations: ContextOptimization[], level: number): ContextOptimization[] {
    // Adjust optimization intensity based on inheritance level
    return optimizations.map(opt => ({
      ...opt,
      intensity: opt.intensity * Math.pow(0.9, level)
    }));
  }

  private async findOrCreateCommonRoot(contexts: InheritanceContext[]): Promise<InheritanceContext> {
    // Find or create common ancestor
    return contexts[0]; // Simplified
  }

  private async mergePreservingHierarchy(
    contexts: InheritanceContext[], 
    root: InheritanceContext
  ): Promise<InheritanceContext> {
    // Merge while preserving hierarchy
    return root; // Simplified
  }

  private async mergeFlattened(
    contexts: InheritanceContext[], 
    root: InheritanceContext
  ): Promise<InheritanceContext> {
    // Flatten and merge
    return root; // Simplified
  }

  private detectCircularReferences(context: InheritanceContext): string[] {
    const visited = new Set<string>();
    const circularRefs: string[] = [];
    
    this.detectCircularReferencesRecursive(context, visited, circularRefs);
    
    return circularRefs;
  }

  private detectCircularReferencesRecursive(
    context: InheritanceContext, 
    visited: Set<string>, 
    circularRefs: string[]
  ): void {
    const docId = context.document.metadata?.id;
    if (!docId) return;
    
    if (visited.has(docId)) {
      circularRefs.push(docId);
      return;
    }
    
    visited.add(docId);
    
    for (const child of context.children) {
      this.detectCircularReferencesRecursive(child, new Set(visited), circularRefs);
    }
  }

  private calculateMaxDepth(context: InheritanceContext): number {
    let maxDepth = context.level;
    
    for (const child of context.children) {
      maxDepth = Math.max(maxDepth, this.calculateMaxDepth(child));
    }
    
    return maxDepth;
  }

  private analyzeContextSizes(context: InheritanceContext): {
    variance: number;
    outliers: string[];
  } {
    // Analyze size distribution
    return {
      variance: 0.5, // Simplified
      outliers: []
    };
  }

  private findOrphanedDependencies(context: InheritanceContext): string[] {
    // Find dependencies that don't exist in the context
    return []; // Simplified
  }
}

// Supporting interfaces

interface InheritanceHierarchy {
  root: ESLDocument;
  levels: Map<number, ESLDocument[]>;
  dependencies: Map<string, string[]>;
  circularRefs: string[];
}

interface InheritanceContextChunk {
  id: string;
  contexts: InheritanceContext[];
  mergedContent: any;
  inheritanceLevel: number;
  relationships: string[];
  tokenCount: number;
  metadata: {
    createdAt: string;
    contextCount: number;
    inheritanceDepth: number;
    preservedRelationships: boolean;
  };
}

interface InheritanceIssue {
  type: 'circular_reference' | 'excessive_depth' | 'unbalanced_contexts' | 'orphaned_dependencies';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedDocuments: string[];
}

interface ContextOptimization {
  type: string;
  intensity: number;
  preserveInheritance: boolean;
}