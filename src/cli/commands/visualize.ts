
import { promises as fs } from 'fs';
import yaml from 'yaml';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { EslSpecification, DataModel } from './interactive'; // Re-use the types

// Function to generate a Mermaid ERD diagram from the spec
function generateMermaidErd(spec: EslSpecification): string {
    let erd = 'erDiagram\n';

    for (const modelName in spec.dataModels) {
        const model = spec.dataModels[modelName];
        erd += `    ${modelName} {\n`;
        for (const propName in model.properties) {
            const prop = model.properties[propName];
            erd += `        ${prop.type} ${propName} "${prop.description || ''}"\n`;
        }
        erd += `    }\n`;
    }

    return erd;
}

export async function visualizeCommand(file: string, options: { output: string }) {
    const spinner = ora(`Reading ESL file: ${file}...`).start();
    try {
        const fileContent = await fs.readFile(file, 'utf-8');
        const spec = yaml.parse(fileContent) as EslSpecification;
        spinner.succeed(`Successfully read and parsed ${file}.`);

        const mermaidSource = generateMermaidErd(spec);
        const mermaidFile = `${options.output}.mmd`;
        await fs.writeFile(mermaidFile, mermaidSource);

        const outputFile = `${options.output}.svg`;
        const mermaidSpinner = ora(`Generating diagram: ${outputFile}...`).start();
        exec(`npx mmdc -i ${mermaidFile} -o ${outputFile}`, (error) => {
            if (error) {
                mermaidSpinner.fail(chalk.red(`Failed to generate diagram: ${error.message}`));
                return;
            }
            mermaidSpinner.succeed(chalk.green(`Successfully generated diagram: ${outputFile}`));
        });

    } catch (error) {
        spinner.fail(chalk.red(`Failed to read or parse file: ${file}`));
        console.error(error);
    }
}
