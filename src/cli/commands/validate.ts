import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { promises as fs } from 'fs';
import { resolve, basename } from 'path';
import { performance } from 'perf_hooks';

import { ESLFramework } from '../../index.js';
import { ESLValidationResult, ESLParseError } from '../../core/types.js';
import { formatErrorMessage, sortErrorsBySeverity } from '../../core/utils.js';

interface ValidateOptions {
  strict: boolean;
  format: string;
  noSemantic: boolean;
}

interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  totalTime: number;
  results: Array<{
    file: string;
    valid: boolean;
    errors: number;
    warnings: number;
    time: number;
  }>;
}

export async function validateCommand(
  filePattern: string,
  options: ValidateOptions
): Promise<void> {
  const startTime = performance.now();
  const spinner = ora('Finding ESL specification files...').start();

  try {
    // Resolve file patterns
    const resolvedFiles = await resolveFilePatterns([filePattern], false);
    
    if (resolvedFiles.length === 0) {
      spinner.fail('No ESL specification files found');
      console.log(chalk.yellow('Tip: Make sure you have .esl.yaml files in the current directory'));
      console.log(chalk.gray('Example: esl validate *.esl.yaml'));
      return;
    }

    spinner.succeed(`Found ${resolvedFiles.length} ESL specification file${resolvedFiles.length === 1 ? '' : 's'}`);

    // Initialize ESL framework with validation options
    const framework = new ESLFramework({
      validateSchema: true,
      resolveInheritance: true,
      enableSemanticAnalysis: !options.noSemantic,
      optimizeForAI: false
    });

    const maxErrors = 50;
    const summary: ValidationSummary = {
      totalFiles: resolvedFiles.length,
      validFiles: 0,
      invalidFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      totalTime: 0,
      results: []
    };

    // Validate each file
    for (let i = 0; i < resolvedFiles.length; i++) {
      const file = resolvedFiles[i]!;
      const fileName = basename(file);
      
      if (options.format !== 'json') {
        spinner.start(`Validating ${fileName} (${i + 1}/${resolvedFiles.length})`);
      }

      const fileStartTime = performance.now();
      
      try {
        const result = await validateFile(framework, file, options);
        const fileTime = performance.now() - fileStartTime;
        
        summary.results.push({
          file: fileName,
          valid: result.valid,
          errors: result.errors.length,
          warnings: result.warnings.length,
          time: fileTime
        });

        if (result.valid) {
          summary.validFiles++;
          if (options.format !== 'json') {
            spinner.succeed(`${fileName} ${chalk.green('✓')} (${fileTime.toFixed(1)}ms)`);
          }
        } else {
          summary.invalidFiles++;
          summary.totalErrors += result.errors.length;
          if (options.format !== 'json') {
            spinner.fail(`${fileName} ${chalk.red('✗')} ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`);
          }
        }

        summary.totalWarnings += result.warnings.length;
        summary.totalTime += fileTime;

        // Report errors and warnings
        if (options.format !== 'json' && (result.errors.length > 0 || result.warnings.length > 0)) {
          reportValidationIssues(file, result, maxErrors);
        }

      } catch (error) {
        const fileTime = performance.now() - fileStartTime;
        summary.invalidFiles++;
        summary.totalErrors++;
        summary.totalTime += fileTime;
        
        summary.results.push({
          file: fileName,
          valid: false,
          errors: 1,
          warnings: 0,
          time: fileTime
        });

        if (options.format !== 'json') {
          spinner.fail(`${fileName} ${chalk.red('✗')} Parse error`);
          console.error(chalk.red('Parse Error:'), error instanceof Error ? error.message : String(error));
        }
      }
    }

    const totalTime = performance.now() - startTime;
    summary.totalTime = totalTime;

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      displayValidationSummary(summary);
    }

    // Exit with appropriate code
    if (summary.invalidFiles > 0) {
      process.exit(1);
    }

  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    
    if (process.env.ESL_VERBOSE === 'true') {
      console.error(error);
    }
    
    process.exit(1);
  }
}

async function resolveFilePatterns(patterns: string[], recursive: boolean): Promise<string[]> {
  const allFiles: string[] = [];
  
  for (const pattern of patterns) {
    try {
      // Check if it's a specific file
      const stat = await fs.stat(pattern).catch((): null => null);
      if (stat?.isFile()) {
        allFiles.push(resolve(pattern));
        continue;
      }
      
      // Check if it's a directory
      if (stat?.isDirectory()) {
        const dirPattern = recursive 
          ? `${pattern}/**/*.esl.{yaml,yml}`
          : `${pattern}/*.esl.{yaml,yml}`;
        const files = await glob(dirPattern);
        allFiles.push(...files.map(f => resolve(f)));
        continue;
      }
      
      // Treat as glob pattern
      const files = await glob(pattern);
      allFiles.push(...files.map(f => resolve(f)));
      
    } catch (error) {
      // Pattern didn't match anything, skip
      continue;
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(allFiles)].sort();
}

async function validateFile(
  framework: ESLFramework,
  filePath: string,
  options: ValidateOptions
): Promise<ESLValidationResult> {
  // Parse and validate the file
  const result = await framework.parseFile(filePath);
  
  // If we have a document and additional validation is requested
  if (result.document && options.strict) {
    const context = framework.createProcessingContext(filePath);
    
    // Perform additional validation
    const additionalResult = await framework.validateDocument(result.document, context);
    
    // Merge results
    return {
      valid: result.valid && additionalResult.valid,
      errors: [...result.errors, ...additionalResult.errors],
      warnings: [...result.warnings, ...additionalResult.warnings],
      document: result.document
    };
  }
  
  return result;
}

function reportValidationIssues(
  filePath: string,
  result: ESLValidationResult,
  maxErrors: number
): void {
  const fileName = basename(filePath);
  const allIssues = [...result.errors, ...result.warnings];
  const sortedIssues = sortErrorsBySeverity(allIssues);
  const issuesToShow = sortedIssues.slice(0, maxErrors);
  
  function getIcon(severity: string): string {
    return severity === 'error' ? chalk.red('✗') : 
           severity === 'warning' ? chalk.yellow('⚠') : chalk.blue('ℹ');
  }
  
  console.log();
  console.log(chalk.underline(`Issues in ${fileName}:`));
  
  issuesToShow.forEach((issue, index) => {
    const icon = getIcon(issue.severity);
    
    const location = issue.line > 0 ? chalk.gray(` (line ${issue.line}${issue.column > 0 ? `, col ${issue.column}` : ''})`) : '';
    
    console.log(`  ${icon} ${formatErrorMessage(issue)}${location}`);
    
    if (issue.suggestions && issue.suggestions.length > 0) {
      issue.suggestions.forEach(suggestion => {
        console.log(chalk.gray(`    💡 ${suggestion}`));
      });
    }
  });
  
  if (sortedIssues.length > maxErrors) {
    const remaining = sortedIssues.length - maxErrors;
    console.log(chalk.gray(`  ... and ${remaining} more issue${remaining === 1 ? '' : 's'}`));
    console.log(chalk.gray(`  Use --max-errors ${sortedIssues.length} to see all issues`));
  }
  
  console.log();
}

function displayValidationSummary(summary: ValidationSummary): void {
  console.log();
  console.log(chalk.bold('Validation Summary'));
  console.log(chalk.gray('─'.repeat(50)));
  
  // Overall results
  console.log(`Files processed: ${summary.totalFiles}`);
  console.log(`Valid files: ${chalk.green(summary.validFiles)}`);
  
  if (summary.invalidFiles > 0) {
    console.log(`Invalid files: ${chalk.red(summary.invalidFiles)}`);
  }
  
  if (summary.totalErrors > 0) {
    console.log(`Total errors: ${chalk.red(summary.totalErrors)}`);
  }
  
  if (summary.totalWarnings > 0) {
    console.log(`Total warnings: ${chalk.yellow(summary.totalWarnings)}`);
  }
  
  console.log(`Total time: ${chalk.cyan(summary.totalTime.toFixed(1))}ms`);
  
  // Performance summary
  if (summary.results.length > 1) {
    const avgTime = summary.totalTime / summary.results.length;
    const slowestFile = summary.results.reduce((prev, current) => 
      current.time > prev.time ? current : prev
    );
    
    console.log();
    console.log(chalk.gray('Performance:'));
    console.log(`Average time per file: ${avgTime.toFixed(1)}ms`);
    console.log(`Slowest file: ${slowestFile.file} (${slowestFile.time.toFixed(1)}ms)`);
  }
  
  // File-by-file results (for smaller sets)
  if (summary.results.length <= 10 && summary.results.length > 1) {
    console.log();
    console.log(chalk.gray('Per-file results:'));
    summary.results.forEach(result => {
      const status = result.valid ? chalk.green('✓') : chalk.red('✗');
      const issues = result.errors > 0 ? chalk.red(` ${result.errors}E`) : '';
      const warnings = result.warnings > 0 ? chalk.yellow(` ${result.warnings}W`) : '';
      const time = chalk.gray(` (${result.time.toFixed(1)}ms)`);
      
      console.log(`  ${status} ${result.file}${issues}${warnings}${time}`);
    });
  }
  
  console.log();
  
  // Final status message
  if (summary.invalidFiles === 0) {
    console.log(chalk.green('✨ All files are valid!'));
  } else {
    console.log(chalk.red(`❌ ${summary.invalidFiles} file${summary.invalidFiles === 1 ? '' : 's'} failed validation`));
  }
  
  // Helpful tips
  if (summary.totalWarnings > 0 && summary.totalErrors === 0) {
    console.log();
    console.log(chalk.yellow('💡 Consider addressing warnings to improve specification quality'));
  }
  
  if (summary.totalErrors > 0) {
    console.log();
    console.log(chalk.yellow('💡 Use --verbose for detailed error information'));
    console.log(chalk.gray('💡 Use --strict for enhanced validation rules'));
  }
}