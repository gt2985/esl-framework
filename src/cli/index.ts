#!/usr/bin/env node

/**
 * ESL CLI - Main entry point
 * This will be populated during Claude Code Session 3
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('esl')
  .description('Enterprise Specification Language CLI')
  .version('1.0.0');

program.parse();
