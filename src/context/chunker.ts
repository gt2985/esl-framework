/**
 * Semantic Chunker - Intelligent chunking system for large ESL specifications
 * Preserves business relationships and semantic meaning while optimizing for AI consumption
 */

import { ESLDocument, BusinessRule, DataStructure, APIEndpoint, WorkflowStep, ESLValidationResult } from '../core/types.js';
import { StreamingOptions } from './manager.js';

export interface ChunkingStrategy {
  name: string;
  maxChunkSize: number;
  preserveRelationships: boolean;
  priorityFields: string[];
  overlapSize?: number;
  boundaryDetection?: 'semantic' | 'structural' | 'size';
}

export interface ContextChunk {
  id: string;
  content: any;
  tokenCount: number;
  relationships: string[];
  priority: number;
  metadata: ChunkMetadata;
  boundaries: ChunkBoundary;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  sourceDocument: string;
  chunkType: 'business_rules' | 'data_structures' | 'api_endpoints' | 'workflows' | 'mixed';
  createdAt: string;
  dependencies: string[];
  qualityScore: number;
  optimized?: boolean;
  originalTokens?: number;
  compressionRatio?: number;
}

export interface ChunkBoundary {
  startLine?: number;
  endLine?: number;
  startElement: string;
  endElement: string;
  overlapWith?: string[];
}

export interface RelationshipMap {
  source: string;
  target: string;
  type: 'dependency' | 'reference' | 'inheritance' | 'composition';
  strength: number;
}

/**
 * Semantic chunking system that intelligently breaks down large ESL specifications
 * while preserving business logic relationships and optimizing for AI processing
 */
export class SemanticChunker {
  private readonly relationshipExtractor: RelationshipExtractor;
  private readonly boundaryDetector: BoundaryDetector;
  private readonly qualityAssessor: ChunkQualityAssessor;

  constructor() {
    this.relationshipExtractor = new RelationshipExtractor();
    this.boundaryDetector = new BoundaryDetector();
    this.qualityAssessor = new ChunkQualityAssessor();
  }

  /**
   * Chunks document based on business rules while preserving dependencies
   */
  async chunkByBusinessRules(document: ESLDocument, maxChunkSize: number = 2000): Promise<ContextChunk[]> {
    const businessRules = document.businessRules || [];
    if (businessRules.length === 0) return [];

    // Build dependency graph
    const relationships = this.relationshipExtractor.extractBusinessRuleRelationships(businessRules);
    const dependencyGraph = this.buildDependencyGraph(relationships);
    
    // Group rules by dependency clusters
    const clusters = this.clusterByDependencies(businessRules, dependencyGraph, maxChunkSize);
    
    const chunks: ContextChunk[] = [];
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const chunk = await this.createBusinessRuleChunk(cluster, i, clusters.length, document, relationships);
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Chunks document based on data structures and their relationships
   */
  async chunkByDataStructures(document: ESLDocument, maxChunkSize: number = 2000): Promise<ContextChunk[]> {
    const dataStructures = document.dataStructures || [];
    if (dataStructures.length === 0) return [];

    // Analyze field references and composition relationships
    const relationships = this.relationshipExtractor.extractDataStructureRelationships(dataStructures);
    
    // Group by composition hierarchies
    const hierarchies = this.groupByCompositionHierarchy(dataStructures, relationships);
    
    const chunks: ContextChunk[] = [];
    let chunkIndex = 0;
    
    for (const hierarchy of hierarchies) {
      const hierarchyChunks = this.chunkHierarchy(hierarchy, maxChunkSize, chunkIndex, document);
      chunks.push(...hierarchyChunks);
      chunkIndex += hierarchyChunks.length;
    }

    return chunks;
  }

  /**
   * Chunks document based on API endpoints grouped by functional domains
   */
  async chunkByAPIEndpoints(document: ESLDocument, maxChunkSize: number = 2000): Promise<ContextChunk[]> {
    const apiEndpoints = document.apiEndpoints || [];
    if (apiEndpoints.length === 0) return [];

    // Group by path patterns and functional domains
    const domains = this.groupEndpointsByDomain(apiEndpoints);
    
    const chunks: ContextChunk[]= [];
    let chunkIndex = 0;
    
    for (const [domain, endpoints] of domains.entries()) {
      const domainChunks = this.chunkAPIEndpoints(endpoints, domain, maxChunkSize, chunkIndex, document);
      chunks.push(...domainChunks);
      chunkIndex += domainChunks.length;
    }

    return chunks;
  }

  /**
   * Chunks document based on workflow sequences and dependencies
   */
  async chunkByWorkflow(document: ESLDocument, maxChunkSize: number = 2000): Promise<ContextChunk[]> {
    const workflowSteps = document.workflowSteps || [];
    if (workflowSteps.length === 0) return [];

    // Build workflow execution graph
    const workflowGraph = this.buildWorkflowGraph(workflowSteps);
    
    // Chunk by execution sequences
    const sequences = this.extractWorkflowSequences(workflowGraph, maxChunkSize);
    
    const chunks: ContextChunk[] = [];
    for (let i = 0; i < sequences.length; i++) {
      const sequence = sequences[i];
      const chunk = await this.createWorkflowChunk(sequence, i, sequences.length, document);
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Adaptive chunking strategy that automatically selects optimal approach
   */
  async chunkByStrategy(document: ESLDocument, strategy: ChunkingStrategy): Promise<ContextChunk[]> {
    switch (strategy.name) {
      case 'business_rules':
        return this.chunkByBusinessRules(document, strategy.maxChunkSize);
      
      case 'data_structures':
        return this.chunkByDataStructures(document, strategy.maxChunkSize);
      
      case 'api_endpoints':
        return this.chunkByAPIEndpoints(document, strategy.maxChunkSize);
      
      case 'workflows':
        return this.chunkByWorkflow(document, strategy.maxChunkSize);
      
      case 'semantic':
        return this.chunkBySemantic(document, strategy);
      
      case 'adaptive':
        return this.chunkAdaptive(document, strategy);
      
      default:
        throw new Error(`Unknown chunking strategy: ${strategy.name}`);
    }
  }

  /**
   * Semantic chunking that preserves meaning across different content types
   */
  async chunkBySemantic(document: ESLDocument, strategy: ChunkingStrategy): Promise<ContextChunk[]> {
    const allChunks: ContextChunk[] = [];
    
    // Priority-based chunking
    for (const field of strategy.priorityFields) {
      let fieldChunks: ContextChunk[] = [];
      
      switch (field) {
        case 'businessRules':
          fieldChunks = await this.chunkByBusinessRules(document, strategy.maxChunkSize);
          break;
        case 'dataStructures':
          fieldChunks = await this.chunkByDataStructures(document, strategy.maxChunkSize);
          break;
        case 'apiEndpoints':
          fieldChunks = await this.chunkByAPIEndpoints(document, strategy.maxChunkSize);
          break;
        case 'workflowSteps':
          fieldChunks = await this.chunkByWorkflow(document, strategy.maxChunkSize);
          break;
      }
      
      allChunks.push(...fieldChunks);
    }

    // Merge overlapping chunks if needed
    if (strategy.preserveRelationships) {
      return this.mergeOverlappingChunks(allChunks, strategy.overlapSize || 0);
    }

    return allChunks;
  }

  /**
   * Adaptive chunking that analyzes document structure and selects optimal strategy
   */
  async chunkAdaptive(document: ESLDocument, strategy: ChunkingStrategy): Promise<ContextChunk[]> {
    const analysis = this.analyzeDocumentStructure(document);
    
    // Select optimal chunking approach based on content
    if (analysis.hasComplexWorkflows && analysis.workflowStepCount > 10) {
      return this.chunkByWorkflow(document, strategy.maxChunkSize);
    }
    
    if (analysis.hasRichDataModel && analysis.dataStructureCount > 15) {
      return this.chunkByDataStructures(document, strategy.maxChunkSize);
    }
    
    if (analysis.hasExtensiveAPI && analysis.apiEndpointCount > 20) {
      return this.chunkByAPIEndpoints(document, strategy.maxChunkSize);
    }
    
    if (analysis.hasComplexBusinessRules && analysis.businessRuleCount > 10) {
      return this.chunkByBusinessRules(document, strategy.maxChunkSize);
    }
    
    // Default to semantic chunking
    return this.chunkBySemantic(document, strategy);
  }

  /**
   * Specialized chunking for streaming large documents
   */
  async chunkForStreaming(document: ESLDocument, options: StreamingOptions): Promise<ContextChunk[]> {
    const strategy: ChunkingStrategy = {
      name: 'streaming',
      maxChunkSize: options.chunkSize,
      preserveRelationships: options.preserveRelationships,
      priorityFields: options.priorityFields,
      overlapSize: options.overlap,
      boundaryDetection: 'semantic'
    };

    // Create overlapping chunks for streaming
    const baseChunks = await this.chunkBySemantic(document, strategy);
    
    if (options.overlap > 0) {
      return this.createOverlappingChunks(baseChunks, options.overlap);
    }
    
    return baseChunks;
  }

  /**
   * Validates that chunk relationships are preserved correctly
   */
  async validateChunkRelationships(chunks: ContextChunk[]): Promise<ESLValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Check for orphaned references
    const allChunkIds = new Set(chunks.map(c => c.id));
    
    for (const chunk of chunks) {
      for (const relationshipId of chunk.relationships) {
        const hasRelatedChunk = chunks.some(c => 
          c.id !== chunk.id && (
            c.relationships.includes(relationshipId) ||
            c.metadata.dependencies.includes(relationshipId)
          )
        );
        
        if (!hasRelatedChunk) {
          warnings.push({
            message: `Chunk ${chunk.id} references ${relationshipId} but no related chunk found`,
            severity: 'warning',
            code: 'ORPHANED_REFERENCE',
            line: 0,
            column: 0
          });
        }
      }
    }
    
    // Check for broken dependency chains
    for (const chunk of chunks) {
      for (const dependency of chunk.metadata.dependencies) {
        const dependencyExists = chunks.some(c => 
          c.content.id === dependency || 
          (c.content.businessRules && c.content.businessRules.some((r: any) => r.id === dependency))
        );
        
        if (!dependencyExists) {
          errors.push({
            message: `Chunk ${chunk.id} depends on ${dependency} which is not found in any chunk`,
            severity: 'error',
            code: 'MISSING_DEPENDENCY',
            line: 0,
            column: 0
          });
        }
      }
    }
    
    // Assess overall quality
    const qualityScores = chunks.map(c => c.metadata.qualityScore);
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    
    if (avgQuality < 0.7) {
      warnings.push({
        message: `Average chunk quality score (${avgQuality.toFixed(2)}) is below recommended threshold (0.7)`,
        severity: 'warning',
        code: 'LOW_QUALITY_CHUNKS',
        line: 0,
        column: 0
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      document: null
    };
  }

  // Private helper methods

  private buildDependencyGraph(relationships: RelationshipMap[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const rel of relationships) {
      if (!graph.has(rel.source)) {
        graph.set(rel.source, []);
      }
      graph.get(rel.source)!.push(rel.target);
    }
    
    return graph;
  }

  private clusterByDependencies(rules: BusinessRule[], graph: Map<string, string[]>, maxSize: number): BusinessRule[][] {
    const clusters: BusinessRule[][] = [];
    const visited = new Set<string>();
    
    for (const rule of rules) {
      if (visited.has(rule.id)) continue;
      
      const cluster = this.collectCluster(rule, rules, graph, visited, maxSize);
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  private collectCluster(rule: BusinessRule, allRules: BusinessRule[], graph: Map<string, string[]>, visited: Set<string>, maxSize: number): BusinessRule[] {
    const cluster: BusinessRule[] = [];
    const queue = [rule.id];
    
    while (queue.length > 0 && cluster.length < maxSize) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const currentRule = allRules.find(r => r.id === currentId);
      if (currentRule) {
        cluster.push(currentRule);
        
        // Add dependencies
        const dependencies = graph.get(currentId) || [];
        queue.push(...dependencies.filter(d => !visited.has(d)));
      }
    }
    
    return cluster;
  }

  private async createBusinessRuleChunk(rules: BusinessRule[], index: number, total: number, document: ESLDocument, relationships: RelationshipMap[]): Promise<ContextChunk> {
    const chunkId = `br_${index}_${Date.now()}`;
    
    const content = {
      metadata: {
        version: document.metadata?.version || '1.0.0',
        id: `${document.metadata?.id || 'unknown'}_chunk_${index}`,
        title: `Business Rules Chunk ${index + 1}`,
        description: `Business rules ${index + 1} of ${total}`,
        chunkInfo: {
          index,
          total,
          type: 'business_rules'
        }
      },
      businessRules: rules
    };

    const relatedIds = relationships
      .filter(r => rules.some(rule => rule.id === r.source || rule.id === r.target))
      .map(r => r.source === rules[0]?.id ? r.target : r.source);

    const dependencies = rules.flatMap(rule => 
      rule.exceptions?.map(ex => ex.id) || []
    );

    return {
      id: chunkId,
      content,
      tokenCount: this.estimateTokenCount(content),
      relationships: relatedIds,
      priority: this.calculatePriority(rules),
      metadata: {
        chunkIndex: index,
        totalChunks: total,
        sourceDocument: document.metadata?.id || 'unknown',
        chunkType: 'business_rules',
        createdAt: new Date().toISOString(),
        dependencies,
        qualityScore: this.qualityAssessor.assessBusinessRuleChunk(rules, relationships)
      },
      boundaries: {
        startElement: rules[0]?.id || '',
        endElement: rules[rules.length - 1]?.id || ''
      }
    };
  }

  private groupByCompositionHierarchy(structures: DataStructure[], relationships: RelationshipMap[]): DataStructure[][] {
    // Group structures by their composition relationships
    const hierarchies: DataStructure[][] = [];
    const processed = new Set<string>();
    
    for (const structure of structures) {
      if (processed.has(structure.id)) continue;
      
      const hierarchy = this.collectHierarchy(structure, structures, relationships, processed);
      if (hierarchy.length > 0) {
        hierarchies.push(hierarchy);
      }
    }
    
    return hierarchies;
  }

  private collectHierarchy(root: DataStructure, allStructures: DataStructure[], relationships: RelationshipMap[], processed: Set<string>): DataStructure[] {
    const hierarchy: DataStructure[] = [];
    const queue = [root.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (processed.has(currentId)) continue;
      
      processed.add(currentId);
      const structure = allStructures.find(s => s.id === currentId);
      if (structure) {
        hierarchy.push(structure);
        
        // Find composed structures
        const composed = relationships
          .filter(r => r.source === currentId && r.type === 'composition')
          .map(r => r.target);
        queue.push(...composed);
      }
    }
    
    return hierarchy;
  }

  private chunkHierarchy(hierarchy: DataStructure[], maxSize: number, startIndex: number, document: ESLDocument): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    
    for (let i = 0; i < hierarchy.length; i += maxSize) {
      const chunkStructures = hierarchy.slice(i, i + maxSize);
      const chunkIndex = startIndex + Math.floor(i / maxSize);
      
      chunks.push(this.createDataStructureChunk(chunkStructures, chunkIndex, document));
    }
    
    return chunks;
  }

  private createDataStructureChunk(structures: DataStructure[], index: number, document: ESLDocument): ContextChunk {
    const chunkId = `ds_${index}_${Date.now()}`;
    
    const content = {
      metadata: {
        version: document.metadata?.version || '1.0.0',
        id: `${document.metadata?.id || 'unknown'}_ds_chunk_${index}`,
        title: `Data Structures Chunk ${index + 1}`,
        description: `Data structures chunk containing ${structures.length} structures`,
        chunkInfo: {
          index,
          type: 'data_structures'
        }
      },
      dataStructures: structures
    };

    return {
      id: chunkId,
      content,
      tokenCount: this.estimateTokenCount(content),
      relationships: structures.flatMap(s => s.fields?.map(f => f.name) || []),
      priority: structures.length, // Higher priority for more structures
      metadata: {
        chunkIndex: index,
        totalChunks: 1, // Would calculate properly
        sourceDocument: document.metadata?.id || 'unknown',
        chunkType: 'data_structures',
        createdAt: new Date().toISOString(),
        dependencies: [],
        qualityScore: this.qualityAssessor.assessDataStructureChunk(structures)
      },
      boundaries: {
        startElement: structures[0]?.id || '',
        endElement: structures[structures.length - 1]?.id || ''
      }
    };
  }

  private groupEndpointsByDomain(endpoints: APIEndpoint[]): Map<string, APIEndpoint[]> {
    const domains = new Map<string, APIEndpoint[]>();
    
    for (const endpoint of endpoints) {
      const domain = this.extractDomain(endpoint.path);
      if (!domains.has(domain)) {
        domains.set(domain, []);
      }
      domains.get(domain)!.push(endpoint);
    }
    
    return domains;
  }

  private extractDomain(path: string): string {
    // Extract domain from API path
    const segments = path.split('/').filter(s => s.length > 0);
    return segments[0] || 'root';
  }

  private chunkAPIEndpoints(endpoints: APIEndpoint[], domain: string, maxSize: number, startIndex: number, document: ESLDocument): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    
    for (let i = 0; i < endpoints.length; i += maxSize) {
      const chunkEndpoints = endpoints.slice(i, i + maxSize);
      const chunkIndex = startIndex + Math.floor(i / maxSize);
      
      chunks.push(this.createAPIEndpointChunk(chunkEndpoints, domain, chunkIndex, document));
    }
    
    return chunks;
  }

  private createAPIEndpointChunk(endpoints: APIEndpoint[], domain: string, index: number, document: ESLDocument): ContextChunk {
    const chunkId = `api_${domain}_${index}_${Date.now()}`;
    
    const content = {
      metadata: {
        version: document.metadata?.version || '1.0.0',
        id: `${document.metadata?.id || 'unknown'}_api_${domain}_chunk_${index}`,
        title: `API Endpoints - ${domain} (Chunk ${index + 1})`,
        description: `API endpoints for ${domain} domain`,
        chunkInfo: {
          index,
          domain,
          type: 'api_endpoints'
        }
      },
      apiEndpoints: endpoints
    };

    return {
      id: chunkId,
      content,
      tokenCount: this.estimateTokenCount(content),
      relationships: endpoints.map(e => e.path),
      priority: endpoints.length,
      metadata: {
        chunkIndex: index,
        totalChunks: 1, // Would calculate properly
        sourceDocument: document.metadata?.id || 'unknown',
        chunkType: 'api_endpoints',
        createdAt: new Date().toISOString(),
        dependencies: [],
        qualityScore: this.qualityAssessor.assessAPIEndpointChunk(endpoints)
      },
      boundaries: {
        startElement: endpoints[0]?.id || '',
        endElement: endpoints[endpoints.length - 1]?.id || ''
      }
    };
  }

  private buildWorkflowGraph(steps: WorkflowStep[]): Map<string, WorkflowStep[]> {
    const graph = new Map<string, WorkflowStep[]>();
    
    for (const step of steps) {
      const dependencies = step.dependencies || [];
      for (const dep of dependencies) {
        if (!graph.has(dep)) {
          graph.set(dep, []);
        }
        graph.get(dep)!.push(step);
      }
    }
    
    return graph;
  }

  private extractWorkflowSequences(graph: Map<string, WorkflowStep[]>, maxSize: number): WorkflowStep[][] {
    // Extract workflow execution sequences
    const sequences: WorkflowStep[][] = [];
    // Simplified implementation - would do proper topological sorting
    
    return sequences;
  }

  private async createWorkflowChunk(steps: WorkflowStep[], index: number, total: number, document: ESLDocument): Promise<ContextChunk> {
    const chunkId = `wf_${index}_${Date.now()}`;
    
    const content = {
      metadata: {
        version: document.metadata?.version || '1.0.0',
        id: `${document.metadata?.id || 'unknown'}_workflow_chunk_${index}`,
        title: `Workflow Steps Chunk ${index + 1}`,
        description: `Workflow steps ${index + 1} of ${total}`,
        chunkInfo: {
          index,
          total,
          type: 'workflows'
        }
      },
      workflowSteps: steps
    };

    return {
      id: chunkId,
      content,
      tokenCount: this.estimateTokenCount(content),
      relationships: steps.flatMap(s => s.dependencies || []),
      priority: steps.length,
      metadata: {
        chunkIndex: index,
        totalChunks: total,
        sourceDocument: document.metadata?.id || 'unknown',
        chunkType: 'workflows',
        createdAt: new Date().toISOString(),
        dependencies: steps.flatMap(s => s.dependencies || []),
        qualityScore: this.qualityAssessor.assessWorkflowChunk(steps)
      },
      boundaries: {
        startElement: steps[0]?.id || '',
        endElement: steps[steps.length - 1]?.id || ''
      }
    };
  }

  private mergeOverlappingChunks(chunks: ContextChunk[], overlapSize: number): ContextChunk[] {
    // Implementation for merging overlapping chunks
    return chunks; // Simplified
  }

  private createOverlappingChunks(chunks: ContextChunk[], overlap: number): ContextChunk[] {
    // Implementation for creating overlapping chunks for streaming
    return chunks; // Simplified
  }

  private analyzeDocumentStructure(document: ESLDocument): {
    hasComplexWorkflows: boolean;
    hasRichDataModel: boolean;
    hasExtensiveAPI: boolean;
    hasComplexBusinessRules: boolean;
    workflowStepCount: number;
    dataStructureCount: number;
    apiEndpointCount: number;
    businessRuleCount: number;
  } {
    return {
      hasComplexWorkflows: (document.workflowSteps?.length || 0) > 5,
      hasRichDataModel: (document.dataStructures?.length || 0) > 10,
      hasExtensiveAPI: (document.apiEndpoints?.length || 0) > 15,
      hasComplexBusinessRules: (document.businessRules?.length || 0) > 8,
      workflowStepCount: document.workflowSteps?.length || 0,
      dataStructureCount: document.dataStructures?.length || 0,
      apiEndpointCount: document.apiEndpoints?.length || 0,
      businessRuleCount: document.businessRules?.length || 0
    };
  }

  private calculatePriority(rules: BusinessRule[]): number {
    // Calculate priority based on rule importance and dependencies
    return rules.reduce((total, rule) => total + (rule.priority || 3), 0) / rules.length;
  }

  private estimateTokenCount(content: any): number {
    // Simple token estimation - would use proper tokenization in production
    const text = JSON.stringify(content);
    return Math.ceil(text.length / 4); // Rough approximation
  }
}

/**
 * Extracts semantic relationships between different ESL elements
 */
class RelationshipExtractor {
  extractBusinessRuleRelationships(rules: BusinessRule[]): RelationshipMap[] {
    const relationships: RelationshipMap[] = [];
    
    // Analyze rule conditions and actions for references
    for (const rule of rules) {
      // Look for references to other rules in conditions/actions
      for (const otherRule of rules) {
        if (rule.id !== otherRule.id) {
          if (rule.condition.includes(otherRule.id) || rule.action.includes(otherRule.id)) {
            relationships.push({
              source: rule.id,
              target: otherRule.id,
              type: 'dependency',
              strength: 0.8
            });
          }
        }
      }
      
      // Analyze exceptions
      if (rule.exceptions) {
        for (const exception of rule.exceptions) {
          relationships.push({
            source: rule.id,
            target: exception.id,
            type: 'dependency',
            strength: 0.6
          });
        }
      }
    }
    
    return relationships;
  }

  extractDataStructureRelationships(structures: DataStructure[]): RelationshipMap[] {
    const relationships: RelationshipMap[] = [];
    
    for (const structure of structures) {
      if (structure.fields) {
        for (const field of structure.fields) {
          // Look for reference fields
          if (field.type === 'reference' && field.referenceTo) {
            relationships.push({
              source: structure.id,
              target: field.referenceTo,
              type: 'reference',
              strength: 0.9
            });
          }
          
          // Look for composition relationships
          const referencedStructure = structures.find(s => s.name.toLowerCase() === field.type.toLowerCase());
          if (referencedStructure) {
            relationships.push({
              source: structure.id,
              target: referencedStructure.id,
              type: 'composition',
              strength: 0.7
            });
          }
        }
      }
    }
    
    return relationships;
  }
}

/**
 * Detects optimal boundaries for chunking
 */
class BoundaryDetector {
  detectSemanticBoundaries(content: any[]): number[] {
    // Detect natural breaking points in content
    const boundaries: number[] = [];
    
    // Simple implementation - would use more sophisticated analysis
    for (let i = 0; i < content.length; i++) {
      if (i > 0 && i % 5 === 0) { // Every 5 items as a boundary
        boundaries.push(i);
      }
    }
    
    return boundaries;
  }
}

/**
 * Assesses the quality of generated chunks
 */
class ChunkQualityAssessor {
  assessBusinessRuleChunk(rules: BusinessRule[], relationships: RelationshipMap[]): number {
    let score = 0.5; // Base score
    
    // Bonus for complete dependency chains
    const hasCompleteChains = this.hasCompleteDependencyChains(rules, relationships);
    if (hasCompleteChains) score += 0.3;
    
    // Bonus for balanced size
    if (rules.length >= 3 && rules.length <= 8) score += 0.2;
    
    return Math.min(1.0, score);
  }

  assessDataStructureChunk(structures: DataStructure[]): number {
    let score = 0.5;
    
    // Bonus for related structures
    const hasRelations = structures.some(s => 
      s.fields?.some(f => structures.some(other => other.name === f.type))
    );
    if (hasRelations) score += 0.3;
    
    // Bonus for reasonable size
    if (structures.length >= 2 && structures.length <= 10) score += 0.2;
    
    return Math.min(1.0, score);
  }

  assessAPIEndpointChunk(endpoints: APIEndpoint[]): number {
    let score = 0.5;
    
    // Bonus for same domain
    const paths = endpoints.map(e => e.path);
    const commonPrefix = this.findCommonPrefix(paths);
    if (commonPrefix.length > 1) score += 0.3;
    
    // Bonus for CRUD completeness
    const methods = new Set(endpoints.map(e => e.method));
    if (methods.has('GET') && methods.has('POST')) score += 0.2;
    
    return Math.min(1.0, score);
  }

  assessWorkflowChunk(steps: WorkflowStep[]): number {
    let score = 0.5;
    
    // Bonus for sequential steps
    const hasSequence = this.hasSequentialSteps(steps);
    if (hasSequence) score += 0.4;
    
    // Bonus for reasonable size
    if (steps.length >= 2 && steps.length <= 6) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private hasCompleteDependencyChains(rules: BusinessRule[], relationships: RelationshipMap[]): boolean {
    // Check if all referenced rules are present
    const ruleIds = new Set(rules.map(r => r.id));
    const referencedIds = relationships.map(r => r.target);
    
    return referencedIds.every(id => ruleIds.has(id));
  }

  private findCommonPrefix(paths: string[]): string {
    if (paths.length === 0) return '';
    
    let prefix = paths[0];
    for (let i = 1; i < paths.length; i++) {
      while (!paths[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (prefix === '') break;
      }
    }
    
    return prefix;
  }

  private hasSequentialSteps(steps: WorkflowStep[]): boolean {
    // Check if steps form a logical sequence
    return steps.some(step => 
      step.dependencies && step.dependencies.some(dep => 
        steps.some(other => other.id === dep)
      )
    );
  }
}