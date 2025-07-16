#!/usr/bin/env node

/**
 * Comprehensive test for ESL Context Management features
 * Tests all context management capabilities including chunking, optimization, and AI context handling
 */

import { ESLFramework } from './dist/index.js';
import { ContextManager } from './dist/context/manager.js';
import { SemanticChunker } from './dist/context/chunker.js';
import { ContextOptimizer } from './dist/context/optimizer.js';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

// Test data: Large ESL specification for context management testing
const testESLSpec = {
  metadata: {
    version: '1.0.0',
    id: 'test-large-spec',
    title: 'Large Test ESL Specification',
    description: 'A comprehensive test specification for context management',
    author: 'ESL Test Suite',
    created: '2024-01-01T00:00:00Z'
  },
  businessRules: Array.from({ length: 25 }, (_, i) => ({
    id: `rule-${i + 1}`,
    name: `Business Rule ${i + 1}`,
    description: `This is a comprehensive business rule that validates ${i + 1} specific scenarios`,
    condition: `user.type === 'premium' && user.credits > ${i * 10}`,
    action: `processTransaction(user, ${i * 100})`,
    priority: (i % 3) + 1,
    exceptions: i % 5 === 0 ? [{
      id: `exception-${i}`,
      condition: `user.vip === true`,
      action: 'bypassRule'
    }] : undefined
  })),
  dataStructures: Array.from({ length: 20 }, (_, i) => ({
    id: `struct-${i + 1}`,
    name: `DataStructure${i + 1}`,
    description: `Data structure for handling ${i + 1} related operations`,
    fields: Array.from({ length: 8 }, (_, j) => ({
      name: `field${j + 1}`,
      type: ['string', 'number', 'boolean', 'date'][j % 4],
      required: j % 2 === 0,
      description: `Field ${j + 1} for structure ${i + 1}`,
      validation: {
        minLength: j > 0 ? j * 2 : undefined,
        maxLength: j > 0 ? j * 20 : undefined
      }
    })),
    relationships: i > 0 ? [`struct-${i}`] : undefined
  })),
  apiEndpoints: Array.from({ length: 30 }, (_, i) => ({
    id: `endpoint-${i + 1}`,
    path: `/api/v1/resource${(i % 5) + 1}/${i + 1}`,
    method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
    description: `API endpoint ${i + 1} for resource management`,
    parameters: Array.from({ length: (i % 3) + 1 }, (_, j) => ({
      name: `param${j + 1}`,
      type: ['string', 'number', 'boolean'][j % 3],
      required: j === 0,
      description: `Parameter ${j + 1} for endpoint ${i + 1}`
    })),
    response: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        data: { type: 'object' }
      }
    },
    authentication: i % 3 === 0 ? { type: 'bearer', required: true } : undefined
  })),
  workflowSteps: Array.from({ length: 15 }, (_, i) => ({
    id: `step-${i + 1}`,
    name: `Workflow Step ${i + 1}`,
    description: `Process step ${i + 1} in the workflow`,
    type: ['automated', 'manual', 'decision'][i % 3],
    dependencies: i > 0 ? [`step-${i}`] : undefined,
    conditions: [{
      field: `status`,
      operator: 'equals',
      value: 'pending'
    }],
    actions: [{
      type: 'update',
      target: 'status',
      value: 'processing'
    }],
    timeout: (i + 1) * 1000,
    retries: i % 3
  })),
  governance: {
    approvalStatus: 'approved',
    riskLevel: 'medium',
    complianceFrameworks: ['SOX', 'GDPR', 'HIPAA'],
    auditTrail: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        user: 'admin',
        action: 'created',
        details: 'Initial specification created'
      }
    ]
  },
  aiContext: {
    modelHints: [
      'This specification requires careful chunking due to size',
      'Preserve relationships between business rules and data structures',
      'API endpoints should be grouped by resource type'
    ],
    constraints: [
      'Maximum token count: 8000',
      'Preserve business logic integrity',
      'Maintain audit trail visibility'
    ],
    tokenOptimization: {
      maxTokens: 8000,
      compressionLevel: 'medium',
      priorityFields: ['businessRules', 'dataStructures', 'governance']
    }
  }
};

/**
 * Test suite for context management
 */
class ContextManagementTests {
  constructor() {
    this.framework = new ESLFramework({
      validateSchema: true,
      enableSemanticAnalysis: true,
      optimizeForAI: true
    });
    this.contextManager = new ContextManager({
      maxTokens: 4000,
      compressionLevel: 'medium',
      targetModel: 'gpt-4',
      enableCaching: true,
      chunkingStrategy: {
        name: 'adaptive',
        maxChunkSize: 2000,
        preserveRelationships: true,
        priorityFields: ['businessRules', 'dataStructures']
      }
    });
    this.chunker = new SemanticChunker();
    this.optimizer = new ContextOptimizer();
    this.testResults = [];
  }

  async runAllTests() {
    console.log(chalk.bold.blue('\n🧪 ESL Context Management Test Suite'));
    console.log(chalk.gray('Testing context creation, chunking, optimization, and AI preparation\n'));

    const tests = [
      this.testContextCreation.bind(this),
      this.testSemanticChunking.bind(this),
      this.testContextOptimization.bind(this),
      this.testContextMerging.bind(this),
      this.testStreamingContext.bind(this),
      this.testContextAnalysis.bind(this),
      this.testCaching.bind(this),
      this.testModelSpecificOptimization.bind(this),
      this.testLargeDocumentHandling.bind(this),
      this.testContextInheritance.bind(this)
    ];

    for (const test of tests) {
      await this.runTest(test);
    }

    this.displayResults();
  }

  async runTest(testFn) {
    const testName = testFn.name.replace('test', '').replace(/([A-Z])/g, ' $1').trim();
    console.log(chalk.yellow(`▶️  ${testName}...`));

    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        status: 'passed',
        duration,
        details: result
      });

      console.log(chalk.green(`✅ ${testName} passed (${duration}ms)`));
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      });

      console.log(chalk.red(`❌ ${testName} failed: ${error.message}`));
    }
  }

  async testContextCreation() {
    // Test basic context creation
    const context = await this.contextManager.createContext(testESLSpec);
    
    if (!context.id) throw new Error('Context ID not generated');
    if (!context.document) throw new Error('Document not included in context');
    if (!context.metadata) throw new Error('Metadata not included in context');
    if (!context.performance) throw new Error('Performance metrics not included');
    
    const estimatedTokens = await this.optimizer.estimateTokens(context.document);
    
    return {
      contextId: context.id,
      tokenCount: estimatedTokens,
      hasOptimization: !!context.optimization,
      processingTime: context.performance.totalTime
    };
  }

  async testSemanticChunking() {
    // Test different chunking strategies
    const strategies = [
      { name: 'business_rules', maxChunkSize: 1500 },
      { name: 'data_structures', maxChunkSize: 2000 },
      { name: 'api_endpoints', maxChunkSize: 1800 },
      { name: 'workflows', maxChunkSize: 1200 },
      { name: 'semantic', maxChunkSize: 2000, priorityFields: ['businessRules', 'dataStructures'] },
      { name: 'adaptive', maxChunkSize: 2500, preserveRelationships: true, priorityFields: ['businessRules'] }
    ];

    const results = {};
    
    for (const strategy of strategies) {
      const chunks = await this.chunker.chunkByStrategy(testESLSpec, strategy);
      const validation = await this.chunker.validateChunkRelationships(chunks);
      
      results[strategy.name] = {
        chunkCount: chunks.length,
        avgTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunks.length,
        validationPassed: validation.valid,
        avgQuality: chunks.reduce((sum, chunk) => sum + chunk.metadata.qualityScore, 0) / chunks.length
      };
    }

    return results;
  }

  async testContextOptimization() {
    // Test context optimization for different models and token limits
    const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'];
    const tokenLimits = [2000, 4000, 8000];
    
    const results = {};
    
    for (const model of models) {
      results[model] = {};
      
      for (const maxTokens of tokenLimits) {
        const context = await this.contextManager.createContext(testESLSpec, {
          maxTokens,
          targetModel: model,
          compressionLevel: 'medium'
        });
        
        const optimizedContext = await this.optimizer.optimizeForModel(context, model);
        const finalTokens = await this.optimizer.estimateTokens(optimizedContext.document);
        
        results[model][maxTokens] = {
          originalTokens: await this.optimizer.estimateTokens(testESLSpec),
          optimizedTokens: finalTokens,
          compressionRatio: (await this.optimizer.estimateTokens(testESLSpec) - finalTokens) / await this.optimizer.estimateTokens(testESLSpec),
          withinLimit: finalTokens <= maxTokens
        };
      }
    }

    return results;
  }

  async testContextMerging() {
    // Test merging multiple contexts
    const contexts = [];
    
    // Create multiple smaller contexts
    for (let i = 0; i < 3; i++) {
      const partialSpec = {
        ...testESLSpec,
        businessRules: testESLSpec.businessRules.slice(i * 8, (i + 1) * 8),
        dataStructures: testESLSpec.dataStructures.slice(i * 6, (i + 1) * 6)
      };
      
      const context = await this.contextManager.createContext(partialSpec);
      contexts.push(context);
    }
    
    // Merge contexts
    const mergedContext = await this.contextManager.mergeContexts(contexts, {
      maxTokens: 6000,
      preserveRelationships: true,
      deduplicateContent: true
    });
    
    const mergedTokens = await this.optimizer.estimateTokens(mergedContext.document);
    
    return {
      originalContexts: contexts.length,
      mergedTokens,
      hasRelationships: mergedContext.relationships.size > 0,
      hasDependencies: mergedContext.dependencies.size > 0,
      mergeTime: mergedContext.performance.mergeTime
    };
  }

  async testStreamingContext() {
    // Test streaming context for large documents
    const streamingOptions = {
      chunkSize: 1500,
      overlap: 200,
      preserveRelationships: true,
      priorityFields: ['businessRules', 'dataStructures']
    };
    
    const chunks = [];
    const streamStart = Date.now();
    
    for await (const chunk of this.contextManager.streamContext(testESLSpec, streamingOptions)) {
      chunks.push(chunk);
      if (chunks.length >= 5) break; // Limit for testing
    }
    
    const streamTime = Date.now() - streamStart;
    
    return {
      chunksStreamed: chunks.length,
      avgChunkSize: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunks.length,
      streamingTime: streamTime,
      hasOverlap: chunks.some(chunk => chunk.boundaries.overlapWith?.length > 0)
    };
  }

  async testContextAnalysis() {
    // Test context quality analysis
    const context = await this.contextManager.createContext(testESLSpec, {
      maxTokens: 5000,
      compressionLevel: 'high'
    });
    
    const analysis = await this.contextManager.analyzeContext(context);
    
    if (analysis.qualityScore < 0 || analysis.qualityScore > 1) {
      throw new Error('Quality score out of range');
    }
    
    if (analysis.tokenEfficiency < 0 || analysis.tokenEfficiency > 1) {
      throw new Error('Token efficiency out of range');
    }
    
    return {
      qualityScore: analysis.qualityScore,
      tokenEfficiency: analysis.tokenEfficiency,
      relationshipPreservation: analysis.relationshipPreservation,
      suggestionCount: analysis.suggestions.length,
      suggestions: analysis.suggestions
    };
  }

  async testCaching() {
    // Test context caching
    const options = {
      maxTokens: 4000,
      enableCaching: true,
      targetModel: 'gpt-4'
    };
    
    // First call should create cache
    const start1 = Date.now();
    const context1 = await this.contextManager.createContext(testESLSpec, options);
    const time1 = Date.now() - start1;
    
    // Second call should use cache
    const start2 = Date.now();
    const context2 = await this.contextManager.createContext(testESLSpec, options);
    const time2 = Date.now() - start2;
    
    const cacheStats = this.contextManager.getCacheStats();
    
    return {
      firstCallTime: time1,
      secondCallTime: time2,
      cacheUsed: context2.fromCache === true,
      cacheSize: cacheStats.size,
      speedImprovement: time1 / time2
    };
  }

  async testModelSpecificOptimization() {
    // Test optimization for specific AI models
    const models = [
      { name: 'gpt-4', maxTokens: 8192 },
      { name: 'claude-3', maxTokens: 100000 },
      { name: 'gemini-pro', maxTokens: 32768 }
    ];
    
    const results = {};
    
    for (const model of models) {
      const context = await this.contextManager.createContext(testESLSpec, {
        maxTokens: Math.min(model.maxTokens, 6000),
        targetModel: model.name
      });
      
      const optimizedContext = await this.optimizer.optimizeForModel(context, model.name);
      const metrics = await this.optimizer.measureOptimization(context, optimizedContext);
      
      results[model.name] = {
        originalTokens: metrics.originalTokens,
        optimizedTokens: metrics.optimizedTokens,
        compressionRatio: metrics.compressionRatio,
        semanticPreservation: metrics.semanticPreservation,
        techniquesUsed: metrics.optimizationTechniques.length
      };
    }

    return results;
  }

  async testLargeDocumentHandling() {
    // Test handling of very large documents
    const largeSpec = {
      ...testESLSpec,
      businessRules: Array.from({ length: 100 }, (_, i) => ({
        ...testESLSpec.businessRules[0],
        id: `large-rule-${i}`,
        name: `Large Rule ${i}`
      })),
      dataStructures: Array.from({ length: 50 }, (_, i) => ({
        ...testESLSpec.dataStructures[0],
        id: `large-struct-${i}`,
        name: `LargeStruct${i}`
      }))
    };
    
    const startTime = Date.now();
    const context = await this.contextManager.createContext(largeSpec, {
      maxTokens: 3000,
      compressionLevel: 'high'
    });
    const processingTime = Date.now() - startTime;
    
    const chunks = await this.contextManager.chunkDocument(largeSpec, 2000);
    
    return {
      processingTime,
      chunkCount: chunks.length,
      finalTokens: await this.optimizer.estimateTokens(context.document),
      compressionAchieved: context.optimization?.metrics?.compressionRatio || 0,
      qualityMaintained: context.optimization?.metrics?.semanticPreservation || 0
    };
  }

  async testContextInheritance() {
    // Test context inheritance resolution
    const baseSpec = {
      ...testESLSpec,
      metadata: { ...testESLSpec.metadata, id: 'base-spec' }
    };
    
    const derivedSpec = {
      ...testESLSpec,
      metadata: { ...testESLSpec.metadata, id: 'derived-spec' },
      extends: ['base-spec'],
      businessRules: testESLSpec.businessRules.slice(0, 5) // Override some rules
    };
    
    const context = await this.contextManager.createContext(derivedSpec);
    
    return {
      hasInheritanceChain: !!context.inheritanceChain,
      inheritanceTime: context.performance.inheritanceTime || 0,
      resolvedSuccessfully: context.validationErrors.length === 0
    };
  }

  displayResults() {
    console.log(chalk.bold.blue('\n📊 Test Results Summary'));
    console.log(chalk.gray('=' * 50));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.blue(`📝 Total: ${total}`));
    
    const avgTime = this.testResults.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(chalk.yellow(`⏱️  Average time: ${avgTime.toFixed(2)}ms`));
    
    // Show failed tests
    const failedTests = this.testResults.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      for (const test of failedTests) {
        console.log(chalk.red(`  • ${test.name}: ${test.error}`));
      }
    }
    
    // Show detailed results for key tests
    console.log(chalk.bold.blue('\n🔍 Key Test Details:'));
    
    const chunkingTest = this.testResults.find(r => r.name === 'Semantic Chunking');
    if (chunkingTest && chunkingTest.details) {
      console.log(chalk.yellow('📊 Chunking Strategy Performance:'));
      for (const [strategy, results] of Object.entries(chunkingTest.details)) {
        console.log(`  ${strategy}: ${results.chunkCount} chunks, ${results.avgQuality.toFixed(2)} quality`);
      }
    }
    
    const optimizationTest = this.testResults.find(r => r.name === 'Context Optimization');
    if (optimizationTest && optimizationTest.details) {
      console.log(chalk.yellow('\n⚡ Model Optimization Performance:'));
      for (const [model, results] of Object.entries(optimizationTest.details)) {
        const avgCompression = Object.values(results).reduce((sum, r) => sum + r.compressionRatio, 0) / Object.values(results).length;
        console.log(`  ${model}: ${(avgCompression * 100).toFixed(1)}% compression`);
      }
    }
    
    console.log(chalk.bold.green(`\n🎉 Context Management Test Suite Complete!`));
    console.log(chalk.gray(`Overall success rate: ${((passed / total) * 100).toFixed(1)}%`));
  }
}

// Run the tests
async function main() {
  const testSuite = new ContextManagementTests();
  await testSuite.runAllTests();
}

main().catch(console.error);