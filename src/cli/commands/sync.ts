/**
 * Sync Command - Bidirectional synchronization between ESL spec and code
 * This command treats the ESL specification as the source of truth and updates code accordingly
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';
import ora from 'ora';
import ts from 'typescript';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { EslSpecification } from './interactive.js';

interface SyncOptions {
    force?: boolean;
    dryRun?: boolean;
    backup?: boolean;
    verbose?: boolean;
}

interface SyncResult {
    filesModified: string[];
    filesCreated: string[];
    errors: string[];
    warnings: string[];
    summary: {
        totalChanges: number;
        modelsSync: number;
        servicesSync: number;
        endpointsSync: number;
    };
}

interface CodeChange {
    filePath: string;
    type: 'create' | 'modify' | 'delete';
    description: string;
    originalContent?: string;
    newContent: string;
    risk: 'low' | 'medium' | 'high';
}

/**
 * Main sync command - synchronizes code with ESL specification
 */
export async function syncCommand(
    specFile: string, 
    codeDir: string, 
    options: SyncOptions = {}
): Promise<void> {
    const spinner = ora('Analyzing specification and code structure...').start();
    
    try {
        // 1. Parse ESL specification
        const specContent = await fs.readFile(specFile, 'utf-8');
        const spec = yaml.parse(specContent) as EslSpecification;
        
        // 2. Analyze current code structure
        const codeAnalysis = await analyzeCodeStructure(codeDir);
        
        // 3. Generate sync plan
        const syncPlan = await generateSyncPlan(spec, codeAnalysis, codeDir);
        
        spinner.succeed('Analysis complete. Generated sync plan.');
        
        // 4. Display sync plan
        await displaySyncPlan(syncPlan, options);
        
        if (syncPlan.summary.totalChanges === 0) {
            console.log(chalk.green('\n✅ Code is already in sync with specification!'));
            return;
        }
        
        // 5. Get user confirmation if not forced
        if (!options.force && !options.dryRun) {
            const { shouldProceed } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldProceed',
                    message: `Apply ${syncPlan.summary.totalChanges} changes to sync code with specification?`,
                    default: false
                }
            ]);
            
            if (!shouldProceed) {
                console.log(chalk.yellow('Sync cancelled by user.'));
                return;
            }
        }
        
        // 6. Apply changes
        if (!options.dryRun) {
            const syncResult = await applySyncPlan(syncPlan, options);
            await displaySyncResult(syncResult);
        } else {
            console.log(chalk.blue('\n🔍 Dry run complete. No changes applied.'));
        }
        
    } catch (error) {
        spinner.fail(chalk.red('Sync operation failed'));
        if (error instanceof Error) {
            console.error(chalk.red(error.message));
        }
        process.exit(1);
    }
}

/**
 * Analyze current code structure
 */
async function analyzeCodeStructure(codeDir: string): Promise<{
    models: Record<string, any>;
    services: Record<string, any>;
    endpoints: Record<string, any>;
    files: string[];
}> {
    const tsFiles = await glob(path.join(codeDir, '**/*.ts'), { 
        ignore: [path.join(codeDir, 'node_modules/**'), path.join(codeDir, 'dist/**')]
    });
    
    const models: Record<string, any> = {};
    const services: Record<string, any> = {};
    const endpoints: Record<string, any> = {};
    
    for (const file of tsFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.ES2022, true);
        
        // Extract classes, interfaces, and functions
        ts.forEachChild(sourceFile, node => {
            if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                const name = node.name?.getText(sourceFile);
                if (name) {
                    const members = extractMembers(node, sourceFile);
                    
                    if (name.endsWith('Service') || name.endsWith('Controller')) {
                        services[name] = { name, members, filePath: file };
                    } else {
                        models[name] = { name, members, filePath: file };
                    }
                }
            }
        });
    }
    
    return { models, services, endpoints, files: tsFiles };
}

/**
 * Extract members from a class or interface
 */
function extractMembers(node: ts.ClassDeclaration | ts.InterfaceDeclaration, sourceFile: ts.SourceFile): any {
    const properties: Record<string, any> = {};
    const methods: Record<string, any> = {};
    
    node.members.forEach(member => {
        if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
            const name = member.name?.getText(sourceFile);
            const type = member.type?.getText(sourceFile) || 'any';
            const optional = !!member.questionToken;
            
            if (name) {
                properties[name] = { type, optional };
            }
        } else if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
            const name = member.name?.getText(sourceFile);
            const parameters = member.parameters.map(param => ({
                name: param.name.getText(sourceFile),
                type: param.type?.getText(sourceFile) || 'any',
                optional: !!param.questionToken
            }));
            const returnType = member.type?.getText(sourceFile) || 'void';
            
            if (name) {
                methods[name] = { parameters, returnType };
            }
        }
    });
    
    return { properties, methods };
}

/**
 * Generate sync plan comparing spec to code
 */
async function generateSyncPlan(
    spec: EslSpecification, 
    codeAnalysis: any, 
    codeDir: string
): Promise<{
    changes: CodeChange[];
    summary: {
        totalChanges: number;
        modelsSync: number;
        servicesSync: number;
        endpointsSync: number;
    };
}> {
    const changes: CodeChange[] = [];
    let modelsSync = 0;
    let servicesSync = 0;
    let endpointsSync = 0;
    
    // 1. Sync data models
    if (spec.dataModels) {
        for (const [modelName, modelSpec] of Object.entries(spec.dataModels)) {
            const existing = codeAnalysis.models[modelName];
            
            if (!existing) {
                // Create new model
                const newModelContent = generateModelCode(modelName, modelSpec);
                const filePath = path.join(codeDir, 'src', 'models', `${modelName.toLowerCase()}.ts`);
                
                changes.push({
                    filePath,
                    type: 'create',
                    description: `Create model ${modelName}`,
                    newContent: newModelContent,
                    risk: 'low'
                });
                modelsSync++;
            } else {
                // Update existing model
                const updatedContent = await updateModelCode(existing, modelSpec);
                
                if (updatedContent !== await fs.readFile(existing.filePath, 'utf-8')) {
                    changes.push({
                        filePath: existing.filePath,
                        type: 'modify',
                        description: `Update model ${modelName}`,
                        originalContent: await fs.readFile(existing.filePath, 'utf-8'),
                        newContent: updatedContent,
                        risk: 'medium'
                    });
                    modelsSync++;
                }
            }
        }
    }
    
    // 2. Sync services
    if (spec.services) {
        for (const [serviceName, serviceSpec] of Object.entries(spec.services)) {
            const existing = codeAnalysis.services[serviceName];
            
            if (!existing) {
                // Create new service
                const newServiceContent = generateServiceCode(serviceName, serviceSpec);
                const filePath = path.join(codeDir, 'src', 'services', `${serviceName.toLowerCase()}.ts`);
                
                changes.push({
                    filePath,
                    type: 'create',
                    description: `Create service ${serviceName}`,
                    newContent: newServiceContent,
                    risk: 'low'
                });
                servicesSync++;
            } else {
                // Update existing service
                const updatedContent = await updateServiceCode(existing, serviceSpec);
                
                if (updatedContent !== await fs.readFile(existing.filePath, 'utf-8')) {
                    changes.push({
                        filePath: existing.filePath,
                        type: 'modify',
                        description: `Update service ${serviceName}`,
                        originalContent: await fs.readFile(existing.filePath, 'utf-8'),
                        newContent: updatedContent,
                        risk: 'high'
                    });
                    servicesSync++;
                }
            }
        }
    }
    
    // 3. Sync API endpoints
    if (spec.apiEndpoints) {
        for (const endpoint of spec.apiEndpoints) {
            const controllerName = `${endpoint.path.split('/')[1]}Controller`;
            const existing = codeAnalysis.services[controllerName];
            
            if (!existing) {
                // Create new controller
                const newControllerContent = generateControllerCode(controllerName, [endpoint]);
                const filePath = path.join(codeDir, 'src', 'controllers', `${controllerName.toLowerCase()}.ts`);
                
                changes.push({
                    filePath,
                    type: 'create',
                    description: `Create controller ${controllerName}`,
                    newContent: newControllerContent,
                    risk: 'medium'
                });
                endpointsSync++;
            } else {
                // Update existing controller
                const updatedContent = await updateControllerCode(existing, endpoint);
                
                if (updatedContent !== await fs.readFile(existing.filePath, 'utf-8')) {
                    changes.push({
                        filePath: existing.filePath,
                        type: 'modify',
                        description: `Update controller ${controllerName} for ${endpoint.method} ${endpoint.path}`,
                        originalContent: await fs.readFile(existing.filePath, 'utf-8'),
                        newContent: updatedContent,
                        risk: 'high'
                    });
                    endpointsSync++;
                }
            }
        }
    }
    
    return {
        changes,
        summary: {
            totalChanges: changes.length,
            modelsSync,
            servicesSync,
            endpointsSync
        }
    };
}

/**
 * Display sync plan to user
 */
async function displaySyncPlan(
    plan: { changes: CodeChange[]; summary: any }, 
    options: SyncOptions
): Promise<void> {
    console.log(chalk.bold.underline('\n🔄 Sync Plan:'));
    
    if (plan.changes.length === 0) {
        return;
    }
    
    // Group changes by type
    const creates = plan.changes.filter(c => c.type === 'create');
    const modifies = plan.changes.filter(c => c.type === 'modify');
    const deletes = plan.changes.filter(c => c.type === 'delete');
    
    if (creates.length > 0) {
        console.log(chalk.green(`\n📄 ${creates.length} files to create:`));
        for (const change of creates) {
            console.log(chalk.green(`  + ${change.filePath}`));
            console.log(chalk.gray(`    ${change.description}`));
        }
    }
    
    if (modifies.length > 0) {
        console.log(chalk.yellow(`\n✏️  ${modifies.length} files to modify:`));
        for (const change of modifies) {
            const riskIcon = getRiskIcon(change.risk);
            console.log(chalk.yellow(`  ${riskIcon} ${change.filePath}`));
            console.log(chalk.gray(`    ${change.description}`));
        }
    }
    
    if (deletes.length > 0) {
        console.log(chalk.red(`\n🗑️  ${deletes.length} files to delete:`));
        for (const change of deletes) {
            console.log(chalk.red(`  - ${change.filePath}`));
            console.log(chalk.gray(`    ${change.description}`));
        }
    }
    
    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.gray(`  Models: ${plan.summary.modelsSync}`));
    console.log(chalk.gray(`  Services: ${plan.summary.servicesSync}`));
    console.log(chalk.gray(`  Endpoints: ${plan.summary.endpointsSync}`));
    console.log(chalk.gray(`  Total changes: ${plan.summary.totalChanges}`));
    
    // Risk assessment
    const highRisk = plan.changes.filter(c => c.risk === 'high').length;
    const mediumRisk = plan.changes.filter(c => c.risk === 'medium').length;
    
    if (highRisk > 0) {
        console.log(chalk.red(`\n⚠️  ${highRisk} high-risk changes detected`));
        console.log(chalk.yellow('   Review these changes carefully before applying'));
    }
    
    if (mediumRisk > 0) {
        console.log(chalk.yellow(`\n⚠️  ${mediumRisk} medium-risk changes detected`));
    }
}

/**
 * Apply sync plan changes
 */
async function applySyncPlan(
    plan: { changes: CodeChange[]; summary: any }, 
    options: SyncOptions
): Promise<SyncResult> {
    const result: SyncResult = {
        filesModified: [],
        filesCreated: [],
        errors: [],
        warnings: [],
        summary: {
            totalChanges: 0,
            modelsSync: 0,
            servicesSync: 0,
            endpointsSync: 0
        }
    };
    
    const spinner = ora('Applying sync changes...').start();
    
    for (const change of plan.changes) {
        try {
            // Create backup if requested
            if (options.backup && change.type === 'modify' && change.originalContent) {
                const backupPath = `${change.filePath}.backup.${Date.now()}`;
                await fs.writeFile(backupPath, change.originalContent);
            }
            
            // Ensure directory exists
            const dir = path.dirname(change.filePath);
            await fs.mkdir(dir, { recursive: true });
            
            // Apply change
            await fs.writeFile(change.filePath, change.newContent);
            
            if (change.type === 'create') {
                result.filesCreated.push(change.filePath);
            } else if (change.type === 'modify') {
                result.filesModified.push(change.filePath);
            }
            
            result.summary.totalChanges++;
            
            if (options.verbose) {
                console.log(chalk.green(`✅ ${change.description}`));
            }
            
        } catch (error) {
            const errorMsg = `Failed to apply change to ${change.filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            
            if (options.verbose) {
                console.log(chalk.red(`❌ ${errorMsg}`));
            }
        }
    }
    
    spinner.succeed(`Applied ${result.summary.totalChanges} changes`);
    return result;
}

/**
 * Display sync result
 */
async function displaySyncResult(result: SyncResult): Promise<void> {
    console.log(chalk.bold.underline('\n🎉 Sync Complete!'));
    
    if (result.filesCreated.length > 0) {
        console.log(chalk.green(`\n📄 Created ${result.filesCreated.length} files:`));
        for (const file of result.filesCreated) {
            console.log(chalk.green(`  + ${file}`));
        }
    }
    
    if (result.filesModified.length > 0) {
        console.log(chalk.yellow(`\n✏️  Modified ${result.filesModified.length} files:`));
        for (const file of result.filesModified) {
            console.log(chalk.yellow(`  ~ ${file}`));
        }
    }
    
    if (result.errors.length > 0) {
        console.log(chalk.red(`\n❌ ${result.errors.length} errors:`));
        for (const error of result.errors) {
            console.log(chalk.red(`  • ${error}`));
        }
    }
    
    if (result.warnings.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${result.warnings.length} warnings:`));
        for (const warning of result.warnings) {
            console.log(chalk.yellow(`  • ${warning}`));
        }
    }
    
    console.log(chalk.bold(`\n📊 Total changes applied: ${result.summary.totalChanges}`));
    console.log(chalk.blue('\n💡 Run tests to verify the changes work correctly'));
}

// Code generation functions

/**
 * Generate TypeScript code for a model
 */
function generateModelCode(modelName: string, modelSpec: any): string {
    const properties = Object.entries(modelSpec.properties || {})
        .map(([name, spec]: [string, any]) => {
            const optional = spec.optional ? '?' : '';
            const type = mapSpecTypeToTS(spec.type);
            const comment = spec.description ? `  /** ${spec.description} */\n` : '';
            return `${comment}  ${name}${optional}: ${type};`;
        })
        .join('\n');
    
    return `/**
 * ${modelSpec.description || `${modelName} model`}
 * Auto-generated from ESL specification
 */
export interface ${modelName} {
${properties}
}

export default ${modelName};
`;
}

/**
 * Generate TypeScript code for a service
 */
function generateServiceCode(serviceName: string, serviceSpec: any): string {
    const methods = Object.entries(serviceSpec.methods || {})
        .map(([name, spec]: [string, any]) => {
            const params = (spec.parameters || [])
                .map((p: any) => `${p.name}: ${mapSpecTypeToTS(p.type)}`)
                .join(', ');
            const returnType = mapSpecTypeToTS(spec.returnType || 'void');
            const comment = spec.description ? `  /**\n   * ${spec.description}\n   */\n` : '';
            
            return `${comment}  async ${name}(${params}): Promise<${returnType}> {
    throw new Error('Method not implemented');
  }`;
        })
        .join('\n\n');
    
    return `/**
 * ${serviceSpec.description || `${serviceName} service`}
 * Auto-generated from ESL specification
 */
export class ${serviceName} {
${methods}
}

export default ${serviceName};
`;
}

/**
 * Generate TypeScript code for a controller
 */
function generateControllerCode(controllerName: string, endpoints: any[]): string {
    const methods = endpoints.map(endpoint => {
        const methodName = `${endpoint.method.toLowerCase()}${endpoint.path.split('/').pop()}`;
        const params = (endpoint.parameters || [])
            .map((p: any) => `${p.name}: ${mapSpecTypeToTS(p.type)}`)
            .join(', ');
        const returnType = mapSpecTypeToTS(endpoint.response?.type || 'any');
        
        return `  /**
   * ${endpoint.description || `${endpoint.method} ${endpoint.path}`}
   */
  async ${methodName}(${params}): Promise<${returnType}> {
    throw new Error('Endpoint not implemented');
  }`;
    }).join('\n\n');
    
    return `/**
 * ${controllerName} controller
 * Auto-generated from ESL specification
 */
export class ${controllerName} {
${methods}
}

export default ${controllerName};
`;
}

/**
 * Update existing model code
 */
async function updateModelCode(existing: any, modelSpec: any): Promise<string> {
    // Simplified: In a real implementation, this would use AST manipulation
    // to preserve existing code while updating/adding properties
    const currentContent = await fs.readFile(existing.filePath, 'utf-8');
    
    // For now, just regenerate the model
    return generateModelCode(existing.name, modelSpec);
}

/**
 * Update existing service code
 */
async function updateServiceCode(existing: any, serviceSpec: any): Promise<string> {
    // Simplified: In a real implementation, this would use AST manipulation
    // to preserve existing implementations while updating signatures
    const currentContent = await fs.readFile(existing.filePath, 'utf-8');
    
    // For now, just regenerate the service
    return generateServiceCode(existing.name, serviceSpec);
}

/**
 * Update existing controller code
 */
async function updateControllerCode(existing: any, endpoint: any): Promise<string> {
    // Simplified: In a real implementation, this would use AST manipulation
    // to add new endpoints while preserving existing ones
    const currentContent = await fs.readFile(existing.filePath, 'utf-8');
    
    // For now, just return current content (no changes)
    return currentContent;
}

// Helper functions

/**
 * Map ESL spec type to TypeScript type
 */
function mapSpecTypeToTS(specType: string): string {
    const typeMap: Record<string, string> = {
        'string': 'string',
        'number': 'number',
        'integer': 'number',
        'boolean': 'boolean',
        'array': 'any[]',
        'object': 'any',
        'date': 'Date',
        'datetime': 'Date',
        'uuid': 'string',
        'email': 'string',
        'url': 'string'
    };
    
    return typeMap[specType] || specType;
}

/**
 * Get risk icon for display
 */
function getRiskIcon(risk: string): string {
    const icons: Record<string, string> = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🔴'
    };
    return icons[risk] || '⚪';
}