#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import command handlers
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { generateCommand } from './commands/generate.js';
import { importCommand } from './commands/import.js';
import { contextCommand } from './commands/context.js';
import { interactiveCommand } from './commands/interactive.js';
import { visualizeCommand } from './commands/visualize.js';
import { diffCommand } from './commands/diff.js';
import { syncCommand } from './commands/sync.js';
import { reverseCommand } from './commands/reverse.js';

// Get version from package.json
function getVersion(): string {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

function setupGlobalErrorHandling() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Error: Unhandled promise rejection'));
    if (process.env.ESL_VERBOSE === 'true') {
      console.error('Promise:', promise);
      console.error('Reason:', reason);
    }
    process.exit(2);
  });

  process.on('uncaughtException', (error) => {
    console.error(chalk.red('Error: Uncaught exception'));
    console.error(error.message);
    if (process.env.ESL_VERBOSE === 'true') {
      console.error(error.stack);
    }
    process.exit(2);
  });
}

function createProgram(): Command {
  const program = new Command();

  program
    .name('esl')
    .description('Enterprise Specification Language framework and CLI')
    .version(getVersion(), '-v, --version', 'output the current version')
    .option('-v, --verbose', 'enable verbose output')
    .option('--no-color', 'disable colored output')
    .helpOption('-h, --help', 'display help for command');

  // Configure global options
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    
    // Configure chalk color support
    if (opts.noColor) {
      chalk.level = 0;
    }
    
    // Configure verbose logging
    if (opts.verbose) {
      process.env.ESL_VERBOSE = 'true';
    }
  });

  return program;
}

function registerCommands(program: Command): void {
  // Initialize project command
  program
    .command('init')
    .description('initialize a new ESL project')
    .argument('<project-type>', 'project type (simple-crm, api-service, enterprise-system, or custom)')
    .option('-t, --template <template>', 'project template', 'basic')
    .option('-d, --directory <directory>', 'target directory', '.')
    .option('--no-git', 'skip git repository initialization')
    .action(initCommand);

  // Validate specifications command
  program
    .command('validate')
    .description('validate ESL specifications')
    .argument('[file-pattern]', 'file pattern to validate', '*.esl.yaml')
    .option('-s, --strict', 'enable strict validation mode')
    .option('-f, --format <format>', 'output format (human, json)', 'human')
    .option('--no-semantic', 'skip semantic analysis')
    .action(validateCommand);

  // Generate code command
  program
    .command('generate')
    .description('generate code from ESL specifications')
    .argument('<target>', 'generation target (typescript, openapi, documentation, tests)')
    .option('-o, --output <directory>', 'output directory', './generated')
    .option('-c, --context <context>', 'context file for AI optimization')
    .option('-t, --template <template>', 'custom template directory')
    .option('--no-metadata', 'exclude governance metadata')
    .action(generateCommand);

  // Import from external tools command
  program
    .command('import')
    .description('import specifications from external tools')
    .argument('<source>', 'import source (openapi, jira, github)')
    .argument('<input>', 'input file or configuration')
    .option('-e, --enhance', 'enhance with AI context and business rules')
    .option('-o, --output <file>', 'output ESL file')
    .option('--format <format>', 'force input format detection')
    .action(importCommand);

  // Context management command
  program
    .command('context')
    .description('manage AI context for ESL specifications')
    .argument('<action>', 'context action (create, chunk, optimize, analyze, stream)')
    .argument('<spec-file>', 'ESL specification file')
    .option('-o, --output <file>', 'output file for results')
    .option('-m, --model <model>', 'target AI model (gpt-4, claude-3, gemini-pro)', 'gpt-4')
    .option('-t, --tokens <number>', 'maximum token count', '4000')
    .option('-c, --compression <level>', 'compression level (low, medium, high)', 'medium')
    .option('-s, --strategy <strategy>', 'chunking strategy (semantic, adaptive, business_rules)')
    .option('-f, --format <format>', 'output format (json, yaml, text)', 'json')
    .option('--stream', 'enable streaming mode for large documents')
    .option('--analyze', 'include detailed analysis in output')
    .action(contextCommand);

  // Interactive specification builder
  program
    .command('interactive')
    .description('launch the interactive specification builder')
    .action(interactiveCommand);

  // Visualize specifications command
  program
    .command('visualize')
    .description('generate a diagram from an ESL specification')
    .argument('<file>', 'ESL file to visualize')
    .option('-o, --output <file>', 'output file name without extension', 'diagram')
    .action(visualizeCommand);

  // Diff command
  program
    .command('diff')
    .description('compare the ESL specification with the codebase to find drift')
    .argument('<spec-file>', 'path to the ESL specification file')
    .argument('<code-directory>', 'path to the code directory')
    .option('-i, --interactive', 'interactively fix drift issues')
    .option('-a, --apply', 'automatically apply all fixable drift fixes')
    .action((specFile, codeDir, options) => diffCommand(specFile, codeDir, options));

  // Sync command
  program
    .command('sync')
    .description('synchronize code with ESL specification (spec is source of truth)')
    .argument('<spec-file>', 'path to the ESL specification file')
    .argument('<code-directory>', 'path to the code directory')
    .option('-f, --force', 'apply changes without confirmation')
    .option('-d, --dry-run', 'show what would be changed without applying')
    .option('-b, --backup', 'create backups of modified files')
    .option('-v, --verbose', 'show detailed progress')
    .action((specFile, codeDir, options) => syncCommand(specFile, codeDir, options));

  // Reverse engineering command
  program.addCommand(reverseCommand);
}

async function main(): Promise<void> {
  setupGlobalErrorHandling();
  
  const program = createProgram();
  registerCommands(program);
  
  // Add example usage
  program.addHelpText('after', `
${chalk.yellow('Examples:')}
  ${chalk.cyan('esl init simple-crm --template basic')}
    Initialize a new simple CRM project with basic template

  ${chalk.cyan('esl validate specs/*.esl.yaml --strict')}
    Validate all ESL specifications in specs directory with strict mode

  ${chalk.cyan('esl generate typescript my-spec.esl.yaml -o ./src')}
    Generate TypeScript code from specification

  ${chalk.cyan('esl import openapi swagger.yaml --enhance')}
    Import OpenAPI specification and enhance with ESL features

  ${chalk.cyan('esl context create my-spec.esl.yaml --model claude-3 --tokens 8000')}
    Create AI-optimized context for large language model processing

  ${chalk.cyan('esl context chunk my-spec.esl.yaml --tokens 2000 --format yaml')}
    Split large specification into manageable chunks

  ${chalk.cyan('esl reverse https://github.com/user/repo --output generated.esl.yaml')}
    Generate ESL specification from existing GitHub repository

  ${chalk.cyan('esl reverse ./my-project --language typescript --include-comments')}
    Generate ESL specification from local TypeScript project

${chalk.yellow('Self-Validation:')}
  ${chalk.cyan('esl validate esl-bootstrap.yaml --strict')}
    Validate ESL's own bootstrap specification

For more information, visit: ${chalk.blue('https://github.com/your-org/esl-framework')}
`);
  
  // Handle no arguments
  if (process.argv.length === 2) {
    program.outputHelp();
    return;
  }
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      
      // Provide helpful suggestions based on error type
      if (error.message.includes('Unknown command')) {
        console.error(chalk.yellow('Run "esl --help" to see available commands'));
      } else if (error.message.includes('argument')) {
        console.error(chalk.yellow('Run "esl <command> --help" for command-specific help'));
      }
      
      process.exit(1);
    } else {
      console.error(chalk.red('An unexpected error occurred'));
      process.exit(2);
    }
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(2);
  });
}

export { main };