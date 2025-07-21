import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import * as ts from 'typescript';
import { glob } from 'glob';

interface ReverseEngineeredSpec {
  eslVersion: string;
  project: {
    name: string;
    version: string;
    description: string;
    repository?: string;
  };
  metadata: {
    generated: string;
    source: string;
    author: string;
  };
  dataModels: Record<string, any>;
  services: Record<string, any>;
  apiEndpoints: any[];
}

interface ModelProperty {
  type: string;
  required?: boolean;
  description?: string;
  default?: any;
}

interface ServiceMethod {
  parameters: Array<{
    name: string;
    type: string;
  }>;
  returns: string;
  description?: string;
}

export const reverseCommand = new Command('reverse')
  .description('Generate ESL specification from existing source code')
  .argument('<source>', 'Source path (GitHub repo URL or local directory)')
  .option('-o, --output <file>', 'Output ESL file', 'reverse-engineered.esl.yaml')
  .option('-l, --language <lang>', 'Source language (typescript, javascript, python)', 'typescript')
  .option('-p, --patterns <patterns>', 'File patterns to analyze', '**/*.ts,**/*.js')
  .option('--include-comments', 'Include code comments as descriptions', false)
  .option('--infer-relationships', 'Infer relationships between models', true)
  .option('--detect-apis', 'Detect API endpoints from routing code', true)
  .option('--dry-run', 'Show what would be generated without creating files', false)
  .option('--verbose', 'Verbose output', false)
  .action(async (source, options) => {
    console.log(chalk.blue('🔄 ESL Reverse Engineering'));
    console.log(chalk.gray(`Source: ${source}`));
    console.log(chalk.gray(`Language: ${options.language}`));
    console.log(chalk.gray(`Output: ${options.output}`));
    console.log('');

    try {
      const workingDir = await prepareSource(source, options);
      const spec = await analyzeSource(workingDir, options);
      
      if (options.dryRun) {
        console.log(chalk.yellow('📋 Dry Run - Generated Specification:'));
        console.log(yaml.dump(spec, { indent: 2 }));
      } else {
        await writeSpecification(spec, options.output);
        console.log(chalk.green(`✅ ESL specification generated: ${options.output}`));
        
        // Validate the generated specification
        console.log(chalk.blue('🔍 Validating generated specification...'));
        try {
          // Import validation function - this would be implemented
          const validation = await validateGeneratedSpec(spec);
          if (validation.valid) {
            console.log(chalk.green('✅ Generated specification is valid'));
          } else {
            console.log(chalk.yellow('⚠️  Generated specification has warnings:'));
            validation.warnings.forEach(warning => {
              console.log(chalk.yellow(`  - ${warning}`));
            });
          }
        } catch (error) {
          console.log(chalk.yellow('⚠️  Could not validate generated specification'));
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error during reverse engineering:'));
      console.error(chalk.red(error.message));
      
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  });

async function prepareSource(source: string, options: any): Promise<string> {
  if (options.verbose) {
    console.log(chalk.gray('📥 Preparing source...'));
  }
  
  // Check if source is a GitHub URL
  if (source.startsWith('https://github.com/') || source.startsWith('git@github.com:')) {
    return await cloneRepository(source, options);
  }
  
  // Check if source is a local directory
  if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
    return path.resolve(source);
  }
  
  throw new Error(`Invalid source: ${source}. Must be a GitHub URL or local directory.`);
}

async function cloneRepository(repoUrl: string, options: any): Promise<string> {
  const tempDir = path.join(process.cwd(), '.esl-temp', Date.now().toString());
  
  if (options.verbose) {
    console.log(chalk.gray(`📥 Cloning repository to ${tempDir}...`));
  }
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    execSync(`git clone ${repoUrl} ${tempDir}`, { 
      stdio: options.verbose ? 'inherit' : 'ignore' 
    });
    return tempDir;
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

async function analyzeSource(workingDir: string, options: any): Promise<ReverseEngineeredSpec> {
  if (options.verbose) {
    console.log(chalk.gray('🔍 Analyzing source code...'));
  }
  
  const spec: ReverseEngineeredSpec = {
    eslVersion: '1.0.0',
    project: await extractProjectInfo(workingDir, options),
    metadata: {
      generated: new Date().toISOString(),
      source: workingDir,
      author: 'ESL Framework Reverse Engineering'
    },
    dataModels: {},
    services: {},
    apiEndpoints: []
  };
  
  switch (options.language) {
    case 'typescript':
    case 'javascript':
      await analyzeTypeScriptProject(workingDir, spec, options);
      break;
    case 'python':
      await analyzePythonProject(workingDir, spec, options);
      break;
    default:
      throw new Error(`Unsupported language: ${options.language}`);
  }
  
  if (options.inferRelationships) {
    inferModelRelationships(spec);
  }
  
  return spec;
}

async function extractProjectInfo(workingDir: string, options: any): Promise<any> {
  const projectInfo = {
    name: path.basename(workingDir),
    version: '1.0.0',
    description: 'Auto-generated from source code'
  };
  
  // Try to extract from package.json
  const packageJsonPath = path.join(workingDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      projectInfo.name = packageJson.name || projectInfo.name;
      projectInfo.version = packageJson.version || projectInfo.version;
      projectInfo.description = packageJson.description || projectInfo.description;
      
      if (packageJson.repository) {
        projectInfo.repository = typeof packageJson.repository === 'string' 
          ? packageJson.repository 
          : packageJson.repository.url;
      }
    } catch (error) {
      if (options.verbose) {
        console.log(chalk.yellow('⚠️  Could not parse package.json'));
      }
    }
  }
  
  // Try to extract from README
  const readmePath = path.join(workingDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      const titleMatch = readmeContent.match(/^# (.+)$/m);
      if (titleMatch) {
        projectInfo.name = titleMatch[1];
      }
      
      const descMatch = readmeContent.match(/^# .+\n\n(.+)$/m);
      if (descMatch) {
        projectInfo.description = descMatch[1];
      }
    } catch (error) {
      if (options.verbose) {
        console.log(chalk.yellow('⚠️  Could not parse README.md'));
      }
    }
  }
  
  return projectInfo;
}

async function analyzeTypeScriptProject(workingDir: string, spec: ReverseEngineeredSpec, options: any): Promise<void> {
  const patterns = options.patterns.split(',');
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: workingDir });
    files.push(...matches.map(file => path.join(workingDir, file)));
  }
  
  if (options.verbose) {
    console.log(chalk.gray(`📁 Found ${files.length} files to analyze`));
  }
  
  for (const file of files) {
    await analyzeTypeScriptFile(file, spec, options);
  }
}

async function analyzeTypeScriptFile(filePath: string, spec: ReverseEngineeredSpec, options: any): Promise<void> {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    visitNode(sourceFile, spec, options);
  } catch (error) {
    if (options.verbose) {
      console.log(chalk.yellow(`⚠️  Could not analyze ${filePath}: ${error.message}`));
    }
  }
}

function visitNode(node: ts.Node, spec: ReverseEngineeredSpec, options: any): void {
  switch (node.kind) {
    case ts.SyntaxKind.InterfaceDeclaration:
      analyzeInterface(node as ts.InterfaceDeclaration, spec, options);
      break;
    case ts.SyntaxKind.ClassDeclaration:
      analyzeClass(node as ts.ClassDeclaration, spec, options);
      break;
    case ts.SyntaxKind.EnumDeclaration:
      analyzeEnum(node as ts.EnumDeclaration, spec, options);
      break;
  }
  
  ts.forEachChild(node, child => visitNode(child, spec, options));
}

function analyzeInterface(node: ts.InterfaceDeclaration, spec: ReverseEngineeredSpec, options: any): void {
  const name = node.name.text;
  const properties: Record<string, ModelProperty> = {};
  
  node.members.forEach(member => {
    if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
      const propName = member.name.text;
      const isOptional = !!member.questionToken;
      
      properties[propName] = {
        type: getTypeString(member.type),
        required: !isOptional
      };
      
      if (options.includeComments) {
        const comment = getLeadingComment(member);
        if (comment) {
          properties[propName].description = comment;
        }
      }
    }
  });
  
  spec.dataModels[name] = {
    properties,
    type: 'interface'
  };
  
  if (options.includeComments) {
    const comment = getLeadingComment(node);
    if (comment) {
      spec.dataModels[name].description = comment;
    }
  }
}

function analyzeClass(node: ts.ClassDeclaration, spec: ReverseEngineeredSpec, options: any): void {
  if (!node.name) return;
  
  const name = node.name.text;
  const isService = name.endsWith('Service') || name.endsWith('Controller');
  
  if (isService) {
    const methods: Record<string, ServiceMethod> = {};
    
    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const methodName = member.name.text;
        const parameters = member.parameters.map(param => ({
          name: param.name.getText(),
          type: getTypeString(param.type)
        }));
        
        methods[methodName] = {
          parameters,
          returns: getTypeString(member.type) || 'void'
        };
        
        if (options.includeComments) {
          const comment = getLeadingComment(member);
          if (comment) {
            methods[methodName].description = comment;
          }
        }
      }
    });
    
    spec.services[name] = {
      methods
    };
  } else {
    // Treat as data model
    const properties: Record<string, ModelProperty> = {};
    
    node.members.forEach(member => {
      if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const propName = member.name.text;
        const isOptional = !!member.questionToken;
        
        properties[propName] = {
          type: getTypeString(member.type),
          required: !isOptional
        };
        
        if (options.includeComments) {
          const comment = getLeadingComment(member);
          if (comment) {
            properties[propName].description = comment;
          }
        }
      }
    });
    
    spec.dataModels[name] = {
      properties,
      type: 'class'
    };
  }
}

function analyzeEnum(node: ts.EnumDeclaration, spec: ReverseEngineeredSpec, options: any): void {
  const name = node.name.text;
  const values: string[] = [];
  
  node.members.forEach(member => {
    if (ts.isIdentifier(member.name)) {
      values.push(member.name.text);
    }
  });
  
  spec.dataModels[name] = {
    type: 'enum',
    values
  };
}

function getTypeString(typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return 'any';
  
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return 'string';
    case ts.SyntaxKind.NumberKeyword:
      return 'number';
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean';
    case ts.SyntaxKind.ArrayType:
      const arrayType = typeNode as ts.ArrayTypeNode;
      return `${getTypeString(arrayType.elementType)}[]`;
    case ts.SyntaxKind.TypeReference:
      const typeRef = typeNode as ts.TypeReferenceNode;
      if (ts.isIdentifier(typeRef.typeName)) {
        return typeRef.typeName.text;
      }
      break;
  }
  
  return 'any';
}

function getLeadingComment(node: ts.Node): string | undefined {
  const sourceFile = node.getSourceFile();
  const commentRanges = ts.getLeadingCommentRanges(sourceFile.getFullText(), node.getFullStart());
  
  if (commentRanges && commentRanges.length > 0) {
    const comment = sourceFile.getFullText().substring(commentRanges[0].pos, commentRanges[0].end);
    return comment.replace(/^\/\*\*?|\*\/|^\s*\*\s?/gm, '').trim();
  }
  
  return undefined;
}

async function analyzePythonProject(workingDir: string, spec: ReverseEngineeredSpec, options: any): Promise<void> {
  // TODO: Implement Python analysis
  console.log(chalk.yellow('⚠️  Python analysis not yet implemented'));
}

function inferModelRelationships(spec: ReverseEngineeredSpec): void {
  // Analyze property types to infer relationships
  for (const [modelName, model] of Object.entries(spec.dataModels)) {
    if (model.properties) {
      for (const [propName, prop] of Object.entries(model.properties)) {
        if (typeof prop === 'object' && prop.type) {
          // Check if property type references another model
          const referencedModel = spec.dataModels[prop.type];
          if (referencedModel) {
            if (!model.relationships) {
              model.relationships = [];
            }
            model.relationships.push({
              type: 'references',
              target: prop.type,
              property: propName
            });
          }
          
          // Check for array types
          if (prop.type.endsWith('[]')) {
            const arrayType = prop.type.slice(0, -2);
            const referencedArrayModel = spec.dataModels[arrayType];
            if (referencedArrayModel) {
              if (!model.relationships) {
                model.relationships = [];
              }
              model.relationships.push({
                type: 'has_many',
                target: arrayType,
                property: propName
              });
            }
          }
        }
      }
    }
  }
}

async function writeSpecification(spec: ReverseEngineeredSpec, outputPath: string): Promise<void> {
  const yamlContent = yaml.dump(spec, { 
    indent: 2,
    lineWidth: 80,
    sortKeys: false
  });
  
  fs.writeFileSync(outputPath, yamlContent, 'utf8');
}

async function validateGeneratedSpec(spec: ReverseEngineeredSpec): Promise<{ valid: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  
  // Check for empty models
  const emptyModels = Object.keys(spec.dataModels).filter(name => {
    const model = spec.dataModels[name];
    return !model.properties || Object.keys(model.properties).length === 0;
  });
  
  if (emptyModels.length > 0) {
    warnings.push(`Found ${emptyModels.length} empty models: ${emptyModels.join(', ')}`);
  }
  
  // Check for services without methods
  const emptyServices = Object.keys(spec.services).filter(name => {
    const service = spec.services[name];
    return !service.methods || Object.keys(service.methods).length === 0;
  });
  
  if (emptyServices.length > 0) {
    warnings.push(`Found ${emptyServices.length} empty services: ${emptyServices.join(', ')}`);
  }
  
  // Check for missing descriptions
  const modelsWithoutDesc = Object.keys(spec.dataModels).filter(name => {
    return !spec.dataModels[name].description;
  });
  
  if (modelsWithoutDesc.length > 0) {
    warnings.push(`${modelsWithoutDesc.length} models are missing descriptions`);
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}