
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';
import ora from 'ora';
import ts from 'typescript';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { EslSpecification } from './interactive.js';

interface CodeModel {
    name: string;
    properties: Record<string, { type: string }>;
    filePath: string;
    methods?: Record<string, { parameters: any[], returnType: string }>;
}

interface CodeService {
    name: string;
    methods: Record<string, { parameters: any[], returnType: string }>;
    filePath: string;
}

interface DriftReport {
    modelDrift: ModelDrift[];
    serviceDrift: ServiceDrift[];
    summary: {
        totalDrift: number;
        modelIssues: number;
        serviceIssues: number;
    };
}

interface ModelDrift {
    type: 'missing_model' | 'extra_model' | 'missing_property' | 'extra_property' | 'type_mismatch';
    modelName: string;
    propertyName?: string;
    expectedType?: string;
    actualType?: string;
    location: 'spec' | 'code';
    filePath?: string;
    fixable: boolean;
}

interface ServiceDrift {
    type: 'missing_service' | 'extra_service' | 'missing_method' | 'extra_method' | 'parameter_mismatch';
    serviceName: string;
    methodName?: string;
    expectedParameters?: any[];
    actualParameters?: any[];
    location: 'spec' | 'code';
    filePath?: string;
    fixable: boolean;
}

// Function to parse TypeScript files and extract class/interface info
async function parseCode(codeDir: string): Promise<{ models: Record<string, CodeModel>, services: Record<string, CodeService> }> {
    const models: Record<string, CodeModel> = {};
    const services: Record<string, CodeService> = {};
    const tsFiles = await glob(path.join(codeDir, '**/*.ts'), { ignore: path.join(codeDir, 'cli/**') });

    for (const file of tsFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.ES2022, true);

        ts.forEachChild(sourceFile, node => {
            if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                const modelName = node.name?.getText(sourceFile);
                if (modelName) {
                    const properties: Record<string, { type: string }> = {};
                    const methods: Record<string, { parameters: any[], returnType: string }> = {};
                    
                    node.members.forEach(member => {
                        if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
                            const propName = member.name.getText(sourceFile);
                            const propType = member.type?.getText(sourceFile) || 'any';
                            properties[propName] = { type: propType };
                        } else if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
                            const methodName = member.name.getText(sourceFile);
                            const parameters = member.parameters.map(param => ({
                                name: param.name.getText(sourceFile),
                                type: param.type?.getText(sourceFile) || 'any',
                                optional: !!param.questionToken
                            }));
                            const returnType = member.type?.getText(sourceFile) || 'void';
                            methods[methodName] = { parameters, returnType };
                        }
                    });
                    
                    models[modelName] = { name: modelName, properties, methods, filePath: file };
                    
                    // Check if this is a service class (has methods and follows naming convention)
                    if (Object.keys(methods).length > 0 && (modelName.endsWith('Service') || modelName.endsWith('Controller'))) {
                        services[modelName] = { name: modelName, methods, filePath: file };
                    }
                }
            }
        });
    }
    
    return { models, services };
}

// The main diff command logic
export async function diffCommand(specFile: string, codeDir: string, options: {
    apply?: boolean;
    interactive?: boolean;
} = {}) {
    const spinner = ora('Analyzing specification and code...').start();
    try {
        // 1. Parse ESL Specification
        const specContent = await fs.readFile(specFile, 'utf-8');
        const spec = yaml.parse(specContent) as EslSpecification;
        const specModels = spec.dataModels;
        const specServices = spec.services || {};

        // 2. Parse TypeScript Code
        const { models: codeModels, services: codeServices } = await parseCode(codeDir);
        spinner.succeed('Analysis complete. Comparing models and services...');

        // 3. Compare and find differences
        const driftReport = await analyzeDrift(specModels, codeModels, specServices, codeServices);
        
        // 4. Display results
        await displayDriftReport(driftReport);

        // 5. Handle interactive/apply modes
        if (options.interactive && driftReport.summary.totalDrift > 0) {
            await handleInteractiveMode(driftReport, specFile, codeDir);
        } else if (options.apply && driftReport.summary.totalDrift > 0) {
            await handleApplyMode(driftReport, specFile, codeDir);
        }

        // 6. Exit with appropriate code
        if (driftReport.summary.totalDrift > 0) {
            process.exit(1);
        }

    } catch (error) {
        spinner.fail(chalk.red('An error occurred during the diff operation.'));
        if (error instanceof Error) {
            console.error(chalk.red(error.message));
        } else {
            console.error(chalk.red('Unknown error'));
        }
        process.exit(1);
    }
}

// Analyze drift between spec and code
async function analyzeDrift(
    specModels: any,
    codeModels: Record<string, CodeModel>,
    specServices: any,
    codeServices: Record<string, CodeService>
): Promise<DriftReport> {
    const modelDrift: ModelDrift[] = [];
    const serviceDrift: ServiceDrift[] = [];

    // Check for model drift
    for (const specModelName in specModels) {
        if (!codeModels[specModelName]) {
            modelDrift.push({
                type: 'missing_model',
                modelName: specModelName,
                location: 'code',
                fixable: true
            });
        } else {
            // Check properties
            const specProps = specModels[specModelName].properties;
            const codeProps = codeModels[specModelName].properties;

            for (const propName in specProps) {
                if (!codeProps[propName]) {
                    modelDrift.push({
                        type: 'missing_property',
                        modelName: specModelName,
                        propertyName: propName,
                        expectedType: specProps[propName].type,
                        location: 'code',
                        filePath: codeModels[specModelName].filePath,
                        fixable: true
                    });
                } else if (specProps[propName].type !== codeProps[propName].type) {
                    modelDrift.push({
                        type: 'type_mismatch',
                        modelName: specModelName,
                        propertyName: propName,
                        expectedType: specProps[propName].type,
                        actualType: codeProps[propName].type,
                        location: 'code',
                        filePath: codeModels[specModelName].filePath,
                        fixable: true
                    });
                }
            }

            for (const propName in codeProps) {
                if (!specProps[propName]) {
                    modelDrift.push({
                        type: 'extra_property',
                        modelName: specModelName,
                        propertyName: propName,
                        actualType: codeProps[propName].type,
                        location: 'spec',
                        filePath: codeModels[specModelName].filePath,
                        fixable: true
                    });
                }
            }
        }
    }

    // Check for extra models in code
    for (const codeModelName in codeModels) {
        if (!specModels[codeModelName]) {
            modelDrift.push({
                type: 'extra_model',
                modelName: codeModelName,
                location: 'spec',
                filePath: codeModels[codeModelName].filePath,
                fixable: true
            });
        }
    }

    // Check for service drift
    for (const specServiceName in specServices) {
        if (!codeServices[specServiceName]) {
            serviceDrift.push({
                type: 'missing_service',
                serviceName: specServiceName,
                location: 'code',
                fixable: true
            });
        } else {
            // Check methods
            const specMethods = specServices[specServiceName].methods || {};
            const codeMethods = codeServices[specServiceName].methods || {};

            for (const methodName in specMethods) {
                if (!codeMethods[methodName]) {
                    serviceDrift.push({
                        type: 'missing_method',
                        serviceName: specServiceName,
                        methodName,
                        expectedParameters: specMethods[methodName].parameters,
                        location: 'code',
                        filePath: codeServices[specServiceName].filePath,
                        fixable: true
                    });
                } else {
                    // Check parameters (simplified comparison)
                    const specParams = specMethods[methodName].parameters || [];
                    const codeParams = codeMethods[methodName].parameters || [];
                    
                    if (specParams.length !== codeParams.length) {
                        serviceDrift.push({
                            type: 'parameter_mismatch',
                            serviceName: specServiceName,
                            methodName,
                            expectedParameters: specParams,
                            actualParameters: codeParams,
                            location: 'code',
                            filePath: codeServices[specServiceName].filePath,
                            fixable: false // Complex parameter changes need manual review
                        });
                    }
                }
            }

            for (const methodName in codeMethods) {
                if (!specMethods[methodName]) {
                    serviceDrift.push({
                        type: 'extra_method',
                        serviceName: specServiceName,
                        methodName,
                        actualParameters: codeMethods[methodName].parameters,
                        location: 'spec',
                        filePath: codeServices[specServiceName].filePath,
                        fixable: true
                    });
                }
            }
        }
    }

    return {
        modelDrift,
        serviceDrift,
        summary: {
            totalDrift: modelDrift.length + serviceDrift.length,
            modelIssues: modelDrift.length,
            serviceIssues: serviceDrift.length
        }
    };
}

// Display drift report
async function displayDriftReport(report: DriftReport) {
    console.log(chalk.bold.underline('\n🔍 ESL Drift Report:'));
    console.log(chalk.gray(`Found ${report.summary.totalDrift} drift issues`));
    
    if (report.summary.totalDrift === 0) {
        console.log(chalk.green('\n✅ No drift detected. Your code and specification are in sync!'));
        return;
    }

    if (report.modelDrift.length > 0) {
        console.log(chalk.bold('\n📊 Model Drift:'));
        for (const drift of report.modelDrift) {
            const icon = getIcon(drift.type);
            const color = getColor(drift.type);
            const message = formatDriftMessage(drift);
            console.log(color(`${icon} ${message}`));
        }
    }

    if (report.serviceDrift.length > 0) {
        console.log(chalk.bold('\n🔧 Service Drift:'));
        for (const drift of report.serviceDrift) {
            const icon = getIcon(drift.type);
            const color = getColor(drift.type);
            const message = formatServiceDriftMessage(drift);
            console.log(color(`${icon} ${message}`));
        }
    }

    // Summary
    console.log(chalk.bold('\n📋 Summary:'));
    console.log(chalk.gray(`  Model issues: ${report.summary.modelIssues}`));
    console.log(chalk.gray(`  Service issues: ${report.summary.serviceIssues}`));
    console.log(chalk.gray(`  Total drift: ${report.summary.totalDrift}`));
    
    const fixableCount = [...report.modelDrift, ...report.serviceDrift].filter(d => d.fixable).length;
    if (fixableCount > 0) {
        console.log(chalk.green(`  Auto-fixable: ${fixableCount}`));
        console.log(chalk.blue('\n💡 Run with --interactive to fix issues interactively'));
        console.log(chalk.blue('   or --apply to auto-fix all fixable issues'));
    }
}

// Handle interactive mode
async function handleInteractiveMode(report: DriftReport, specFile: string, codeDir: string) {
    console.log(chalk.bold('\n🔧 Interactive Drift Resolution'));
    
    const allDrift = [...report.modelDrift, ...report.serviceDrift];
    const fixableDrift = allDrift.filter(d => d.fixable);
    
    if (fixableDrift.length === 0) {
        console.log(chalk.yellow('No auto-fixable drift found. Manual intervention required.'));
        return;
    }

    const { shouldProceed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'shouldProceed',
            message: `Found ${fixableDrift.length} fixable issues. Do you want to review and fix them?`,
            default: true
        }
    ]);

    if (!shouldProceed) {
        console.log(chalk.yellow('Drift resolution cancelled.'));
        return;
    }

    let fixedCount = 0;
    
    for (const drift of fixableDrift) {
        const message = 'type' in drift && drift.type.includes('service') ? 
            formatServiceDriftMessage(drift as ServiceDrift) : 
            formatDriftMessage(drift as ModelDrift);
        
        const { shouldFix } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldFix',
                message: `Fix: ${message}?`,
                default: true
            }
        ]);

        if (shouldFix) {
            const success = await applyDriftFix(drift, specFile, codeDir);
            if (success) {
                fixedCount++;
                console.log(chalk.green('  ✅ Fixed'));
            } else {
                console.log(chalk.red('  ❌ Fix failed'));
            }
        }
    }
    
    console.log(chalk.bold(`\n🎉 Fixed ${fixedCount} out of ${fixableDrift.length} issues`));
}

// Handle apply mode
async function handleApplyMode(report: DriftReport, specFile: string, codeDir: string) {
    console.log(chalk.bold('\n🔧 Auto-fixing drift issues...'));
    
    const allDrift = [...report.modelDrift, ...report.serviceDrift];
    const fixableDrift = allDrift.filter(d => d.fixable);
    
    if (fixableDrift.length === 0) {
        console.log(chalk.yellow('No auto-fixable drift found.'));
        return;
    }

    const spinner = ora(`Applying fixes to ${fixableDrift.length} issues...`).start();
    let fixedCount = 0;
    
    for (const drift of fixableDrift) {
        const success = await applyDriftFix(drift, specFile, codeDir);
        if (success) {
            fixedCount++;
        }
    }
    
    spinner.succeed(`Applied ${fixedCount} fixes out of ${fixableDrift.length} issues`);
}

// Apply drift fix
async function applyDriftFix(drift: ModelDrift | ServiceDrift, specFile: string, codeDir: string): Promise<boolean> {
    try {
        if ('modelName' in drift) {
            return await applyModelDriftFix(drift as ModelDrift, specFile, codeDir);
        } else {
            return await applyServiceDriftFix(drift as ServiceDrift, specFile, codeDir);
        }
    } catch (error) {
        console.error(chalk.red(`Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return false;
    }
}

// Apply model drift fix
async function applyModelDriftFix(drift: ModelDrift, specFile: string, codeDir: string): Promise<boolean> {
    if (drift.location === 'spec') {
        // Update spec file
        return await updateSpecFile(drift, specFile);
    } else {
        // Update code file
        return await updateCodeFile(drift, codeDir);
    }
}

// Apply service drift fix
async function applyServiceDriftFix(drift: ServiceDrift, specFile: string, codeDir: string): Promise<boolean> {
    if (drift.location === 'spec') {
        // Update spec file
        return await updateSpecFileForService(drift, specFile);
    } else {
        // Update code file
        return await updateCodeFileForService(drift, codeDir);
    }
}

// Update spec file for models
async function updateSpecFile(drift: ModelDrift, specFile: string): Promise<boolean> {
    const specContent = await fs.readFile(specFile, 'utf-8');
    const spec = yaml.parse(specContent) as EslSpecification;
    
    switch (drift.type) {
        case 'extra_model':
            if (!spec.dataModels[drift.modelName]) {
                spec.dataModels[drift.modelName] = {
                    id: drift.modelName,
                    name: drift.modelName,
                    description: `Auto-generated model from code`,
                    properties: {}
                };
            }
            break;
        case 'extra_property':
            if (spec.dataModels[drift.modelName] && drift.propertyName) {
                spec.dataModels[drift.modelName].properties[drift.propertyName] = {
                    type: drift.actualType || 'string',
                    description: 'Auto-generated property from code'
                };
            }
            break;
    }
    
    const updatedContent = yaml.stringify(spec);
    await fs.writeFile(specFile, updatedContent, 'utf-8');
    return true;
}

// Update code file for models
async function updateCodeFile(drift: ModelDrift, codeDir: string): Promise<boolean> {
    // This would require AST manipulation - simplified for now
    console.log(chalk.yellow(`Code file updates not implemented yet for: ${drift.type}`));
    return false;
}

// Update spec file for services
async function updateSpecFileForService(drift: ServiceDrift, specFile: string): Promise<boolean> {
    const specContent = await fs.readFile(specFile, 'utf-8');
    const spec = yaml.parse(specContent) as EslSpecification;
    
    if (!spec.services) {
        spec.services = {};
    }
    
    switch (drift.type) {
        case 'extra_service':
            if (!spec.services[drift.serviceName]) {
                spec.services[drift.serviceName] = {
                    id: drift.serviceName,
                    name: drift.serviceName,
                    description: `Auto-generated service from code`,
                    methods: {}
                };
            }
            break;
        case 'extra_method':
            if (spec.services[drift.serviceName] && drift.methodName) {
                if (!spec.services[drift.serviceName].methods) {
                    spec.services[drift.serviceName].methods = {};
                }
                spec.services[drift.serviceName].methods[drift.methodName] = {
                    description: 'Auto-generated method from code',
                    parameters: drift.actualParameters || [],
                    returnType: 'any'
                };
            }
            break;
    }
    
    const updatedContent = yaml.stringify(spec);
    await fs.writeFile(specFile, updatedContent, 'utf-8');
    return true;
}

// Update code file for services
async function updateCodeFileForService(drift: ServiceDrift, codeDir: string): Promise<boolean> {
    // This would require AST manipulation - simplified for now
    console.log(chalk.yellow(`Code file updates not implemented yet for: ${drift.type}`));
    return false;
}

// Helper functions
function getIcon(type: string): string {
    const icons: Record<string, string> = {
        'missing_model': '❌',
        'extra_model': '⚠️',
        'missing_property': '❌',
        'extra_property': '⚠️',
        'type_mismatch': '🔄',
        'missing_service': '❌',
        'extra_service': '⚠️',
        'missing_method': '❌',
        'extra_method': '⚠️',
        'parameter_mismatch': '🔄'
    };
    return icons[type] || '❓';
}

function getColor(type: string): (text: string) => string {
    const errorTypes = ['missing_model', 'missing_property', 'missing_service', 'missing_method'];
    const warningTypes = ['extra_model', 'extra_property', 'extra_service', 'extra_method'];
    
    if (errorTypes.includes(type)) {
        return chalk.red;
    } else if (warningTypes.includes(type)) {
        return chalk.yellow;
    } else {
        return chalk.blue;
    }
}

function formatDriftMessage(drift: ModelDrift): string {
    switch (drift.type) {
        case 'missing_model':
            return `Model '${drift.modelName}' found in spec but not in code`;
        case 'extra_model':
            return `Model '${drift.modelName}' found in code but not in spec`;
        case 'missing_property':
            return `Property '${drift.modelName}.${drift.propertyName}' (${drift.expectedType}) found in spec but not in code`;
        case 'extra_property':
            return `Property '${drift.modelName}.${drift.propertyName}' (${drift.actualType}) found in code but not in spec`;
        case 'type_mismatch':
            return `Property '${drift.modelName}.${drift.propertyName}' type mismatch: expected ${drift.expectedType}, got ${drift.actualType}`;
        default:
            return `Unknown drift type: ${drift.type}`;
    }
}

function formatServiceDriftMessage(drift: ServiceDrift): string {
    switch (drift.type) {
        case 'missing_service':
            return `Service '${drift.serviceName}' found in spec but not in code`;
        case 'extra_service':
            return `Service '${drift.serviceName}' found in code but not in spec`;
        case 'missing_method':
            return `Method '${drift.serviceName}.${drift.methodName}' found in spec but not in code`;
        case 'extra_method':
            return `Method '${drift.serviceName}.${drift.methodName}' found in code but not in spec`;
        case 'parameter_mismatch':
            return `Method '${drift.serviceName}.${drift.methodName}' has parameter mismatch`;
        default:
            return `Unknown service drift type: ${drift.type}`;
    }
}
