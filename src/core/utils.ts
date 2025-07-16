import { readFile as fsReadFile, writeFile as fsWriteFile, access } from 'fs/promises';
import { mkdirSync } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ESLDocument, ESLParseError, ESLValidationResult, ProcessingContext } from './types.js';
import { ESL_FILE_EXTENSIONS, TOKEN_LIMITS } from './constants.js';

export class ESLError extends Error {
  constructor(
    message: string,
    public code: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'ESLError';
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fsReadFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new ESLError(
      `Failed to read file: ${filePath}`,
      'FILE_READ_ERROR'
    );
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    await fsWriteFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new ESLError(
      `Failed to write file: ${filePath}`,
      'FILE_WRITE_ERROR'
    );
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function isESLFile(filePath: string): boolean {
  return ESL_FILE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

export function normalizeFilePath(filePath: string): string {
  return path.resolve(filePath);
}

export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  if (filePath.endsWith('.esl.yaml') || filePath.endsWith('.esl.yml')) {
    return '.esl.yaml';
  }
  return ext;
}

export function parseYAML(content: string): unknown {
  try {
    return yaml.parse(content);
  } catch (error) {
    if (error instanceof yaml.YAMLParseError) {
      throw new ESLError(
        `YAML parse error: ${error.message}`,
        'YAML_PARSE_ERROR',
        error.linePos?.[0].line,
        error.linePos?.[0].col
      );
    }
    throw new ESLError(
      'Failed to parse YAML content',
      'YAML_PARSE_ERROR'
    );
  }
}

export function stringifyYAML(data: unknown): string {
  try {
    return yaml.stringify(data, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0
    });
  } catch (error) {
    throw new ESLError(
      'Failed to stringify to YAML',
      'YAML_STRINGIFY_ERROR'
    );
  }
}

export function validateIdentifier(id: string, fieldName: string = 'id'): ESLParseError[] {
  const errors: ESLParseError[] = [];
  
  if (!id || typeof id !== 'string') {
    errors.push({
      message: `${fieldName} is required and must be a string`,
      line: 0,
      column: 0,
      code: 'INVALID_IDENTIFIER',
      severity: 'error'
    });
    return errors;
  }
  
  if (id.length > TOKEN_LIMITS.ID_MAX_LENGTH) {
    errors.push({
      message: `${fieldName} exceeds maximum length of ${TOKEN_LIMITS.ID_MAX_LENGTH} characters`,
      line: 0,
      column: 0,
      code: 'IDENTIFIER_TOO_LONG',
      severity: 'error'
    });
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(id)) {
    errors.push({
      message: `${fieldName} must start with letter or underscore and contain only alphanumeric characters, underscores, and hyphens`,
      line: 0,
      column: 0,
      code: 'INVALID_IDENTIFIER_FORMAT',
      severity: 'error'
    });
  }
  
  return errors;
}

export function validateDescription(description: string | undefined, fieldName: string = 'description'): ESLParseError[] {
  const errors: ESLParseError[] = [];
  
  if (description && description.length > TOKEN_LIMITS.DESCRIPTION_MAX_LENGTH) {
    errors.push({
      message: `${fieldName} exceeds maximum length of ${TOKEN_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
      line: 0,
      column: 0,
      code: 'DESCRIPTION_TOO_LONG',
      severity: 'warning'
    });
  }
  
  return errors;
}

export function validateFieldName(name: string, fieldName: string = 'field name'): ESLParseError[] {
  const errors: ESLParseError[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push({
      message: `${fieldName} is required and must be a string`,
      line: 0,
      column: 0,
      code: 'INVALID_FIELD_NAME',
      severity: 'error'
    });
    return errors;
  }
  
  if (name.length > TOKEN_LIMITS.FIELD_NAME_MAX_LENGTH) {
    errors.push({
      message: `${fieldName} exceeds maximum length of ${TOKEN_LIMITS.FIELD_NAME_MAX_LENGTH} characters`,
      line: 0,
      column: 0,
      code: 'FIELD_NAME_TOO_LONG',
      severity: 'error'
    });
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    errors.push({
      message: `${fieldName} must start with letter or underscore and contain only alphanumeric characters and underscores`,
      line: 0,
      column: 0,
      code: 'INVALID_FIELD_NAME_FORMAT',
      severity: 'error'
    });
  }
  
  return errors;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function truncateText(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  const words = text.split(/\s+/);
  const targetWords = Math.floor(maxTokens / 1.3);
  
  if (targetWords <= 0) {
    return '';
  }
  
  return words.slice(0, targetWords).join(' ') + '...';
}

export function sanitizeForAI(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createValidationResult(
  valid: boolean,
  errors: ESLParseError[] = [],
  warnings: ESLParseError[] = [],
  document?: ESLDocument
): ESLValidationResult {
  return {
    valid,
    errors,
    warnings,
    document
  };
}

export function mergeValidationResults(...results: ESLValidationResult[]): ESLValidationResult {
  const allErrors: ESLParseError[] = [];
  const allWarnings: ESLParseError[] = [];
  let isValid = true;
  let finalDocument: ESLDocument | undefined;
  
  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    if (!result.valid) {
      isValid = false;
    }
    if (result.document) {
      finalDocument = result.document;
    }
  }
  
  return createValidationResult(isValid, allErrors, allWarnings, finalDocument);
}

export function createProcessingContext(basePath: string): ProcessingContext {
  return {
    basePath: normalizeFilePath(basePath),
    importCache: new Map(),
    validationErrors: [],
    processingOptions: {
      validateSchema: true,
      resolveInheritance: true,
      processImports: true,
      enableSemanticAnalysis: false,
      optimizeForAI: false,
      targetFormat: 'typescript'
    }
  };
}

export function resolveImportPath(importPath: string, currentFilePath: string): string {
  if (path.isAbsolute(importPath)) {
    return normalizeFilePath(importPath);
  }
  
  const currentDir = path.dirname(currentFilePath);
  return normalizeFilePath(path.join(currentDir, importPath));
}

export function generateId(): string {
  return `esl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatErrorMessage(error: ESLParseError): string {
  const location = error.line ? ` (line ${error.line}${error.column ? `, col ${error.column}` : ''})` : '';
  return `[${error.severity.toUpperCase()}] ${error.message}${location}`;
}

export function sortErrorsBySeverity(errors: ESLParseError[]): ESLParseError[] {
  const severityOrder = { error: 0, warning: 1, info: 2 };
  return [...errors].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    const lineDiff = (a.line || 0) - (b.line || 0);
    if (lineDiff !== 0) return lineDiff;
    
    return (a.column || 0) - (b.column || 0);
  });
}