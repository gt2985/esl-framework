
import inquirer from 'inquirer';
import yaml from 'yaml';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

// Define interfaces for our data structures
export interface Property {
    type: string;
    description: string;
    required?: boolean;
}

export interface DataModel {
    id?: string;
    name?: string;
    description: string;
    properties: Record<string, Property>;
}

export interface ServiceMethod {
    description: string;
    parameters: Array<{
        name: string;
        type: string;
    }>;
    returnType: string;
}

export interface Service {
    id: string;
    name: string;
    description: string;
    methods: Record<string, ServiceMethod>;
}

export interface APIEndpoint {
    id: string;
    path: string;
    method: string;
    description: string;
    parameters: Array<{
        name: string;
        type: string;
        in?: string;
    }>;
    response: {
        type: string;
        properties?: Record<string, any>;
    };
    authentication?: {
        type: string;
        required: boolean;
    };
}

export interface EslSpecification {
    eslVersion: string;
    project: {
        name: string;
        description: string;
        version: string;
        author: string;
    };
    dataModels: Record<string, DataModel>;
    services?: Record<string, Service>;
    apiEndpoints?: APIEndpoint[];
}

// Function to ask for properties of a data model
async function askForProperties(): Promise<Record<string, Property>> {
    const properties: Record<string, Property> = {};
    let addMore = true;
    while (addMore) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Property name (e.g., firstName):',
                validate: input => input ? true : 'Property name cannot be empty.'
            },
            {
                type: 'list',
                name: 'type',
                message: 'Property type:',
                choices: ['string', 'number', 'boolean', 'date', 'uuid', 'object', 'array']
            },
            {
                type: 'input',
                name: 'description',
                message: 'Property description:'
            },
            {
                type: 'confirm',
                name: 'required',
                message: 'Is this property required?',
                default: true
            },
            {
                type: 'confirm',
                name: 'addMore',
                message: 'Add another property?',
                default: true
            }
        ]);
        properties[answers.name] = {
            type: answers.type,
            description: answers.description,
            required: answers.required
        };
        addMore = answers.addMore;
    }
    return properties;
}

// Function to ask for data models in a module
async function askForDataModels(): Promise<Record<string, DataModel>> {
    const models: Record<string, DataModel> = {};
    let addMore = true;
    console.log(chalk.cyan('\n--- Defining Data Models ---'));
    while (addMore) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Data model name (e.g., User, Product):',
                validate: input => input ? true : 'Model name cannot be empty.'
            },
            {
                type: 'input',
                name: 'description',
                message: 'Data model description:'
            }
        ]);
        
        const properties = await askForProperties();
        models[answers.name] = {
            description: answers.description,
            properties: properties
        };

        const addMoreAnswer = await inquirer.prompt([{
            type: 'confirm',
            name: 'addMore',
            message: 'Add another data model?',
            default: false
        }]);
        addMore = addMoreAnswer.addMore;
    }
    return models;
}

// Main interactive command function
export async function interactiveCommand() {
    console.log(chalk.bold.yellow('Welcome to the ESL Interactive Specification Builder!'));
    console.log('This wizard will guide you through creating a detailed .esl.yaml file.');

    const projectInfo = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project?',
            validate: input => input ? true : 'Project name cannot be empty.'
        },
        {
            type: 'input',
            name: 'description',
            message: 'Provide a short description of the project:'
        },
        {
            type: 'input',
            name: 'version',
            message: 'Initial version:',
            default: '1.0.0'
        },
        {
            type: 'input',
            name: 'author',
            message: 'Author:'
        }
    ]);

    const dataModels = await askForDataModels();

    const spec: EslSpecification = {
        eslVersion: '1.0',
        project: {
            name: projectInfo.projectName,
            description: projectInfo.description,
            version: projectInfo.version,
            author: projectInfo.author
        },
        dataModels: dataModels
    };

    const finalAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'filename',
            message: 'Enter the output filename:',
            default: `${projectInfo.projectName.toLowerCase().replace(/\s+/g, '-')}.esl.yaml`
        }
    ]);

    const spinner = ora('Generating ESL specification file...').start();
    try {
        const yamlString = yaml.stringify(spec);
        await fs.writeFile(finalAnswers.filename, yamlString);
        spinner.succeed(chalk.green(`Successfully created ${finalAnswers.filename}!`));
    } catch (error) {
        spinner.fail(chalk.red('Failed to create specification file.'));
        console.error(error);
    }
}
