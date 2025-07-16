import chalk from 'chalk';
import { resolve } from 'path';
import { existsSync } from 'fs';
import ora from 'ora';
import { ESLFramework, ContextManager, ProcessingContext, ContextChunk } from '../../index.js';

export async function contextCommand(
  action: string,
  specFile: string,
  options: {
    output?: string;
    model?: string;
    tokens?: number;
    compression?: 'low' | 'medium' | 'high';
    strategy?: string;
    format?: 'json' | 'yaml' | 'text';
    stream?: boolean;
    analyze?: boolean;
  }
): Promise<void> {
  const spinner = ora('Processing ESL context...').start();

  try {
    // Validate spec file exists
    const specPath = resolve(specFile);
    if (!existsSync(specPath)) {
      spinner.fail(`Specification file not found: ${specPath}`);
      process.exit(1);
    }

    // Initialize ESL framework
    const esl = new ESLFramework({
      validateSchema: true,
      resolveInheritance: true,
      optimizeForAI: true
    });

    // Parse the document
    spinner.text = 'Parsing ESL document...';
    const parseResult = await esl.parseFile(specPath);
    
    if (!parseResult.valid || !parseResult.document) {
      spinner.fail('Failed to parse ESL document');
      console.error(chalk.red('Validation errors:'));
      parseResult.errors.forEach(error => {
        console.error(chalk.red(`  - ${error.message} (line ${error.line})`));
      });
      process.exit(1);
    }

    // Initialize context manager
    const contextManager = new ContextManager({
      maxTokens: options.tokens || 4000,
      targetModel: options.model || 'gpt-4',
      compressionLevel: options.compression || 'medium',
      priorityFields: ['businessRules', 'dataStructures', 'governance']
    });

    spinner.text = `Executing context action: ${action}...`;

    switch (action) {
      case 'create':
        await handleCreateContext(contextManager, parseResult.document, options, spinner);
        break;
      
      case 'chunk':
        await handleChunkDocument(contextManager, parseResult.document, options, spinner);
        break;
      
      case 'optimize':
        await handleOptimizeContext(contextManager, parseResult.document, options, spinner);
        break;
      
      case 'analyze':
        await handleAnalyzeContext(contextManager, parseResult.document, options, spinner);
        break;
      
      case 'stream':
        await handleStreamContext(contextManager, parseResult.document, options, spinner);
        break;
      
      default:
        spinner.fail(`Unknown context action: ${action}`);
        console.error(chalk.yellow('Available actions: create, chunk, optimize, analyze, stream'));
        process.exit(1);
    }

  } catch (error) {
    spinner.fail('Context processing failed');
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.ESL_VERBOSE === 'true') {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}

async function handleCreateContext(
  manager: ContextManager,
  document: any,
  options: any,
  spinner: any
): Promise<void> {
  spinner.text = 'Creating optimized context...';
  
  const context = await manager.createContext(document, {
    maxTokens: options.tokens,
    targetModel: options.model,
    compressionLevel: options.compression
  });

  spinner.succeed('Context created successfully');
  
  console.log(chalk.green('\nContext Summary:'));
  console.log(`  ID: ${context.id}`);
  console.log(`  Token Count: ${context.metrics?.tokenCount || 'N/A'}`);
  console.log(`  Quality Score: ${context.metrics?.qualityScore?.toFixed(2) || 'N/A'}`);
  console.log(`  Compression Ratio: ${(context.metrics?.compressionRatio * 100)?.toFixed(1) || 'N/A'}%`);
  console.log(`  Processing Time: ${context.performance.totalTime?.toFixed(2) || 'N/A'}ms`);

  if (options.output) {
    await saveContext(context, options.output, options.format || 'json');
    console.log(chalk.blue(`\nContext saved to: ${options.output}`));
  }

  if (options.analyze) {
    const analysis = await manager.analyzeContext(context);
    console.log(chalk.cyan('\nContext Analysis:'));
    console.log(`  Quality Score: ${analysis.qualityScore.toFixed(2)}`);
    console.log(`  Token Efficiency: ${(analysis.tokenEfficiency * 100).toFixed(1)}%`);
    console.log(`  Relationship Preservation: ${(analysis.relationshipPreservation * 100).toFixed(1)}%`);
    
    if (analysis.suggestions.length > 0) {
      console.log(chalk.yellow('\nSuggestions:'));
      analysis.suggestions.forEach(suggestion => {
        console.log(chalk.yellow(`  - ${suggestion}`));
      });
    }
  }
}

async function handleChunkDocument(
  manager: ContextManager,
  document: any,
  options: any,
  spinner: any
): Promise<void> {
  spinner.text = 'Chunking document...';
  
  const chunks = await manager.chunkDocument(document, options.tokens || 2000);

  spinner.succeed(`Document chunked into ${chunks.length} parts`);
  
  console.log(chalk.green('\nChunking Summary:'));
  console.log(`  Total Chunks: ${chunks.length}`);
  console.log(`  Average Token Count: ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)}`);
  
  // Show chunk details
  chunks.forEach((chunk, index) => {
    console.log(`  Chunk ${index + 1}: ${chunk.metadata.chunkType} (${chunk.tokenCount} tokens, priority: ${chunk.priority})`);
  });

  if (options.output) {
    await saveChunks(chunks, options.output, options.format || 'json');
    console.log(chalk.blue(`\nChunks saved to: ${options.output}`));
  }
}

async function handleOptimizeContext(
  manager: ContextManager,
  document: any,
  options: any,
  spinner: any
): Promise<void> {
  spinner.text = 'Optimizing context...';
  
  // First create a basic context
  const context = await manager.createContext(document);
  
  // Then optimize it
  const optimizedContext = await manager.optimizeContext(context, options.tokens || 4000);

  spinner.succeed('Context optimized successfully');
  
  const metrics = optimizedContext.metrics!;
  console.log(chalk.green('\nOptimization Results:'));
  console.log(`  Original Tokens: ${metrics.tokenCount}`);
  console.log(`  Compression Ratio: ${(metrics.compressionRatio * 100).toFixed(1)}%`);
  console.log(`  Quality Score: ${metrics.qualityScore.toFixed(2)}`);
  console.log(`  Processing Time: ${metrics.optimizationTime.toFixed(2)}ms`);

  if (options.output) {
    await saveContext(optimizedContext, options.output, options.format || 'json');
    console.log(chalk.blue(`\nOptimized context saved to: ${options.output}`));
  }
}

async function handleAnalyzeContext(
  manager: ContextManager,
  document: any,
  options: any,
  spinner: any
): Promise<void> {
  spinner.text = 'Analyzing context...';
  
  const context = await manager.createContext(document);
  const analysis = await manager.analyzeContext(context);

  spinner.succeed('Context analysis complete');
  
  console.log(chalk.green('\nContext Analysis Report:'));
  console.log(`  Overall Quality Score: ${analysis.qualityScore.toFixed(2)}/1.0`);
  console.log(`  Token Efficiency: ${(analysis.tokenEfficiency * 100).toFixed(1)}%`);
  console.log(`  Relationship Preservation: ${(analysis.relationshipPreservation * 100).toFixed(1)}%`);
  
  // Cache statistics
  const cacheStats = manager.getCacheStats();
  console.log(chalk.cyan('\nCache Statistics:'));
  console.log(`  Cache Size: ${cacheStats.size} entries`);
  console.log(`  Memory Usage: ${(cacheStats.memoryUsage / 1024).toFixed(2)} KB`);
  
  if (analysis.suggestions.length > 0) {
    console.log(chalk.yellow('\nOptimization Suggestions:'));
    analysis.suggestions.forEach((suggestion, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${suggestion}`));
    });
  }

  if (options.output) {
    await saveAnalysis(analysis, cacheStats, options.output, options.format || 'json');
    console.log(chalk.blue(`\nAnalysis saved to: ${options.output}`));
  }
}

async function handleStreamContext(
  manager: ContextManager,
  document: any,
  options: any,
  spinner: any
): Promise<void> {
  spinner.text = 'Setting up context streaming...';
  
  let chunkCount = 0;
  const chunks: ContextChunk[] = [];

  spinner.succeed('Starting context stream...');
  
  for await (const chunk of manager.streamContext(document, {
    chunkSize: options.tokens || 2000,
    overlap: 200,
    priorityFields: ['businessRules', 'dataStructures']
  })) {
    chunkCount++;
    chunks.push(chunk);
    
    console.log(chalk.green(`Chunk ${chunkCount}: ${chunk.metadata.chunkType} (${chunk.tokenCount} tokens)`));
    
    if (options.format === 'text') {
      console.log(chalk.gray(`  Content preview: ${JSON.stringify(chunk.content).slice(0, 100)}...`));
    }
  }

  console.log(chalk.cyan(`\nStreaming complete: ${chunkCount} chunks processed`));

  if (options.output) {
    await saveChunks(chunks, options.output, options.format || 'json');
    console.log(chalk.blue(`\nStream chunks saved to: ${options.output}`));
  }
}

async function saveContext(context: ProcessingContext, outputPath: string, format: string): Promise<void> {
  const { writeFile } = await import('fs/promises');
  
  let content: string;
  switch (format) {
    case 'yaml':
      const yaml = await import('yaml');
      content = yaml.stringify(context);
      break;
    case 'text':
      content = JSON.stringify(context, null, 2);
      break;
    default:
      content = JSON.stringify(context, null, 2);
  }
  
  await writeFile(outputPath, content, 'utf-8');
}

async function saveChunks(chunks: ContextChunk[], outputPath: string, format: string): Promise<void> {
  const { writeFile } = await import('fs/promises');
  
  let content: string;
  switch (format) {
    case 'yaml':
      const yaml = await import('yaml');
      content = yaml.stringify(chunks);
      break;
    case 'text':
      content = chunks.map((chunk, index) => 
        `=== Chunk ${index + 1} ===\nType: ${chunk.metadata.chunkType}\nTokens: ${chunk.tokenCount}\nContent: ${JSON.stringify(chunk.content, null, 2)}\n`
      ).join('\n');
      break;
    default:
      content = JSON.stringify(chunks, null, 2);
  }
  
  await writeFile(outputPath, content, 'utf-8');
}

async function saveAnalysis(
  analysis: any, 
  cacheStats: any, 
  outputPath: string, 
  format: string
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  
  const data = {
    analysis,
    cacheStats,
    timestamp: new Date().toISOString()
  };
  
  let content: string;
  switch (format) {
    case 'yaml':
      const yaml = await import('yaml');
      content = yaml.stringify(data);
      break;
    case 'text':
      content = `Context Analysis Report\n` +
               `Generated: ${data.timestamp}\n\n` +
               `Quality Score: ${analysis.qualityScore.toFixed(2)}\n` +
               `Token Efficiency: ${(analysis.tokenEfficiency * 100).toFixed(1)}%\n` +
               `Relationship Preservation: ${(analysis.relationshipPreservation * 100).toFixed(1)}%\n\n` +
               `Suggestions:\n${analysis.suggestions.map((s: string, i: number) => `  ${i + 1}. ${s}`).join('\n')}`;
      break;
    default:
      content = JSON.stringify(data, null, 2);
  }
  
  await writeFile(outputPath, content, 'utf-8');
}