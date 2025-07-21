# CI/CD Integration Guide

This guide covers how to integrate the ESL Framework into your CI/CD pipelines for automated specification validation, drift detection, and code synchronization.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions](#github-actions)
- [Jenkins Integration](#jenkins-integration)
- [GitLab CI/CD](#gitlab-cicd)
- [Azure DevOps](#azure-devops)
- [Docker Integration](#docker-integration)
- [Monitoring and Reporting](#monitoring-and-reporting)
- [Best Practices](#best-practices)

## Overview

The ESL Framework provides several CI/CD integration points:

- **Specification Validation**: Ensure specifications are valid before deployment
- **Drift Detection**: Automatically detect when code diverges from specifications
- **Code Generation**: Generate code artifacts during build processes
- **Documentation Updates**: Keep documentation synchronized with specifications
- **Quality Gates**: Enforce specification quality standards

## GitHub Actions

### Complete Workflow

```yaml
# .github/workflows/esl-pipeline.yml
name: ESL Framework Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  ESL_VERSION: 'latest'

jobs:
  validate:
    name: Validate Specifications
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install ESL Framework
        run: npm install -g esl-framework@${{ env.ESL_VERSION }}
        
      - name: Validate specifications
        run: |
          echo "Validating all ESL specifications..."
          esl validate specs/**/*.esl.yaml --strict --format json > validation-results.json
          
      - name: Upload validation results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: validation-results
          path: validation-results.json
          
  drift-detection:
    name: Drift Detection
    runs-on: ubuntu-latest
    needs: validate
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          npm ci
          npm install -g esl-framework@${{ env.ESL_VERSION }}
          
      - name: Check for drift
        id: drift-check
        run: |
          echo "Checking for specification drift..."
          esl diff specs/api.esl.yaml ./src --format json > drift-report.json
          
          # Check if drift was detected
          if [ $? -eq 1 ]; then
            echo "drift-detected=true" >> $GITHUB_OUTPUT
            echo "⚠️ Specification drift detected!" >> $GITHUB_STEP_SUMMARY
          else
            echo "drift-detected=false" >> $GITHUB_OUTPUT
            echo "✅ No drift detected" >> $GITHUB_STEP_SUMMARY
          fi
          
      - name: Generate drift report
        if: steps.drift-check.outputs.drift-detected == 'true'
        run: |
          echo "## 📊 Drift Detection Report" > drift-summary.md
          echo "Generated on $(date)" >> drift-summary.md
          echo "" >> drift-summary.md
          
          # Convert JSON to markdown
          esl diff specs/api.esl.yaml ./src --format markdown >> drift-summary.md
          
      - name: Comment on PR
        if: github.event_name == 'pull_request' && steps.drift-check.outputs.drift-detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const driftReport = fs.readFileSync('drift-summary.md', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: driftReport
            });
            
      - name: Upload drift report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: drift-report
          path: |
            drift-report.json
            drift-summary.md
            
  code-generation:
    name: Code Generation
    runs-on: ubuntu-latest
    needs: [validate, drift-detection]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          npm ci
          npm install -g esl-framework@${{ env.ESL_VERSION }}
          
      - name: Generate code
        run: |
          echo "Generating TypeScript code..."
          esl generate typescript specs/api.esl.yaml -o ./src/generated
          
          echo "Generating OpenAPI specification..."
          esl generate openapi specs/api.esl.yaml -o ./docs/api
          
          echo "Generating documentation..."
          esl generate documentation specs/api.esl.yaml -o ./docs/generated
          
      - name: Check for changes
        id: changes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            echo "changes-detected=true" >> $GITHUB_OUTPUT
            echo "📝 Generated code changes detected" >> $GITHUB_STEP_SUMMARY
          else
            echo "changes-detected=false" >> $GITHUB_OUTPUT
            echo "✅ No code changes needed" >> $GITHUB_STEP_SUMMARY
          fi
          
      - name: Create PR for generated code
        if: steps.changes.outputs.changes-detected == 'true' && github.ref == 'refs/heads/main'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: update generated code from specifications"
          title: "Auto-generated code updates"
          body: |
            ## 🤖 Automated Code Generation
            
            This PR contains automatically generated code updates based on specification changes.
            
            ### Changes:
            - Updated TypeScript interfaces and services
            - Regenerated OpenAPI specification
            - Updated documentation
            
            ### Review Notes:
            - Verify that generated code matches business requirements
            - Check for any breaking changes
            - Ensure tests still pass
            
            *This PR was automatically created by the ESL Framework CI/CD pipeline.*
          branch: auto/generated-code-updates
          delete-branch: true
          
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: validate
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          npm ci
          npm install -g esl-framework@${{ env.ESL_VERSION }}
          
      - name: Security audit
        run: |
          npm audit --audit-level=moderate
          
      - name: Validate security rules
        run: |
          echo "Validating security rules in specifications..."
          esl validate specs/**/*.esl.yaml --security --strict
          
      - name: CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [validate, drift-detection, code-generation, security-scan]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: |
          npm ci
          npm install -g esl-framework@${{ env.ESL_VERSION }}
          
      - name: Build project
        run: npm run build
        
      - name: Final sync check
        run: |
          echo "Final synchronization check..."
          esl sync specs/api.esl.yaml ./src --dry-run --strict
          
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Your deployment commands here
          
      - name: Create release
        if: success()
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          draft: false
          prerelease: false
```

### Reusable Workflows

```yaml
# .github/workflows/esl-validate.yml
name: ESL Validation

on:
  workflow_call:
    inputs:
      spec-pattern:
        required: false
        type: string
        default: "specs/**/*.esl.yaml"
      strict-mode:
        required: false
        type: boolean
        default: true
        
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      - run: esl validate ${{ inputs.spec-pattern }} ${{ inputs.strict-mode && '--strict' || '' }}
```

## Jenkins Integration

### Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        ESL_VERSION = 'latest'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh '''
                    nvm use $NODE_VERSION
                    npm install -g esl-framework@$ESL_VERSION
                '''
            }
        }
        
        stage('Validate Specifications') {
            steps {
                script {
                    def validationResult = sh(
                        script: 'esl validate specs/**/*.esl.yaml --strict --format json',
                        returnStatus: true
                    )
                    
                    if (validationResult != 0) {
                        error "Specification validation failed"
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'validation-results.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('Drift Detection') {
            steps {
                script {
                    def driftResult = sh(
                        script: 'esl diff specs/api.esl.yaml ./src --format json > drift-report.json',
                        returnStatus: true
                    )
                    
                    if (driftResult == 1) {
                        currentBuild.result = 'UNSTABLE'
                        echo "Specification drift detected - see drift-report.json"
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'drift-report.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('Code Generation') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    esl generate typescript specs/api.esl.yaml -o ./src/generated
                    esl generate openapi specs/api.esl.yaml -o ./docs/api
                    esl generate documentation specs/api.esl.yaml -o ./docs/generated
                '''
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    npm run build
                    esl sync specs/api.esl.yaml ./src --dry-run --strict
                '''
                // Add deployment steps
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'docs/generated',
                reportFiles: 'index.html',
                reportName: 'ESL Documentation'
            ])
        }
        
        failure {
            emailext (
                subject: "ESL Pipeline Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "The ESL Framework pipeline has failed. Check the build logs for details.",
                recipientProviders: [developers(), requestor()]
            )
        }
    }
}
```

## GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - drift-detection
  - generate
  - deploy

variables:
  NODE_VERSION: "18"
  ESL_VERSION: "latest"

before_script:
  - apt-get update -qq && apt-get install -y -qq git
  - curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  - apt-get install -y nodejs
  - npm install -g esl-framework@$ESL_VERSION

validate-specifications:
  stage: validate
  script:
    - esl validate specs/**/*.esl.yaml --strict --format json
  artifacts:
    reports:
      junit: validation-results.xml
    paths:
      - validation-results.json
    expire_in: 1 week

drift-detection:
  stage: drift-detection
  script:
    - esl diff specs/api.esl.yaml ./src --format json > drift-report.json
  artifacts:
    paths:
      - drift-report.json
    expire_in: 1 week
  allow_failure: true

generate-code:
  stage: generate
  script:
    - esl generate typescript specs/api.esl.yaml -o ./src/generated
    - esl generate openapi specs/api.esl.yaml -o ./docs/api
    - esl generate documentation specs/api.esl.yaml -o ./docs/generated
  artifacts:
    paths:
      - src/generated/
      - docs/api/
      - docs/generated/
    expire_in: 1 week
  only:
    - main

deploy:
  stage: deploy
  script:
    - npm run build
    - esl sync specs/api.esl.yaml ./src --dry-run --strict
    # Add deployment commands
  only:
    - main
  environment:
    name: production
    url: https://your-app.com
```

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18'
  eslVersion: 'latest'

stages:
  - stage: Validate
    displayName: 'Validate Specifications'
    jobs:
      - job: ValidateSpecs
        displayName: 'Validate ESL Specifications'
        steps:
          - task: NodeTool@0
            displayName: 'Install Node.js'
            inputs:
              versionSpec: '$(nodeVersion)'
              
          - script: |
              npm install -g esl-framework@$(eslVersion)
            displayName: 'Install ESL Framework'
            
          - script: |
              esl validate specs/**/*.esl.yaml --strict --format json
            displayName: 'Validate Specifications'
            
          - task: PublishTestResults@2
            displayName: 'Publish Validation Results'
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: 'validation-results.xml'
              
  - stage: DriftDetection
    displayName: 'Drift Detection'
    dependsOn: Validate
    jobs:
      - job: CheckDrift
        displayName: 'Check for Specification Drift'
        steps:
          - task: NodeTool@0
            displayName: 'Install Node.js'
            inputs:
              versionSpec: '$(nodeVersion)'
              
          - script: |
              npm install -g esl-framework@$(eslVersion)
            displayName: 'Install ESL Framework'
            
          - script: |
              esl diff specs/api.esl.yaml ./src --format json > drift-report.json
            displayName: 'Check for Drift'
            continueOnError: true
            
          - task: PublishBuildArtifacts@1
            displayName: 'Publish Drift Report'
            inputs:
              pathToPublish: 'drift-report.json'
              artifactName: 'drift-report'
              
  - stage: Deploy
    displayName: 'Deploy'
    dependsOn: [Validate, DriftDetection]
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProduction
        displayName: 'Deploy to Production'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: NodeTool@0
                  displayName: 'Install Node.js'
                  inputs:
                    versionSpec: '$(nodeVersion)'
                    
                - script: |
                    npm install -g esl-framework@$(eslVersion)
                  displayName: 'Install ESL Framework'
                  
                - script: |
                    esl sync specs/api.esl.yaml ./src --dry-run --strict
                  displayName: 'Final Sync Check'
                  
                - script: |
                    npm run build
                    # Add deployment commands
                  displayName: 'Build and Deploy'
```

## Docker Integration

### Dockerfile for ESL Framework

```dockerfile
# Dockerfile.esl
FROM node:18-alpine

# Install ESL Framework
RUN npm install -g esl-framework

# Set working directory
WORKDIR /workspace

# Copy specifications
COPY specs/ ./specs/
COPY src/ ./src/

# Default command
CMD ["esl", "--help"]
```

### Docker Compose for CI/CD

```yaml
# docker-compose.ci.yml
version: '3.8'

services:
  esl-validator:
    build:
      context: .
      dockerfile: Dockerfile.esl
    volumes:
      - ./specs:/workspace/specs
      - ./src:/workspace/src
    command: esl validate specs/**/*.esl.yaml --strict
    
  esl-drift-checker:
    build:
      context: .
      dockerfile: Dockerfile.esl
    volumes:
      - ./specs:/workspace/specs
      - ./src:/workspace/src
      - ./reports:/workspace/reports
    command: sh -c "esl diff specs/api.esl.yaml ./src --format json > ./reports/drift-report.json"
    depends_on:
      - esl-validator
      
  esl-generator:
    build:
      context: .
      dockerfile: Dockerfile.esl
    volumes:
      - ./specs:/workspace/specs
      - ./src:/workspace/src
      - ./generated:/workspace/generated
    command: esl generate typescript specs/api.esl.yaml -o ./generated
    depends_on:
      - esl-validator
      - esl-drift-checker
```

## Monitoring and Reporting

### Metrics Collection

```yaml
# .github/workflows/esl-metrics.yml
name: ESL Metrics

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      
      - name: Collect metrics
        run: |
          esl validate specs/**/*.esl.yaml --strict --format json > validation-metrics.json
          esl diff specs/api.esl.yaml ./src --format json > drift-metrics.json
          
      - name: Process metrics
        run: |
          node scripts/process-metrics.js
          
      - name: Upload to monitoring system
        run: |
          curl -X POST "${{ secrets.MONITORING_ENDPOINT }}" \
            -H "Content-Type: application/json" \
            -d @processed-metrics.json
```

### Quality Gates

```yaml
# quality-gates.yml
name: Quality Gates

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      
      - name: Quality gate - Validation
        run: |
          esl validate specs/**/*.esl.yaml --strict
          
      - name: Quality gate - Drift threshold
        run: |
          DRIFT_COUNT=$(esl diff specs/api.esl.yaml ./src --format json | jq '.issues | length')
          if [ $DRIFT_COUNT -gt 5 ]; then
            echo "❌ Drift count ($DRIFT_COUNT) exceeds threshold (5)"
            exit 1
          else
            echo "✅ Drift count ($DRIFT_COUNT) within acceptable range"
          fi
          
      - name: Quality gate - Complexity
        run: |
          COMPLEXITY=$(esl context analyze specs/api.esl.yaml --format json | jq '.complexity')
          if (( $(echo "$COMPLEXITY > 0.8" | bc -l) )); then
            echo "❌ Specification complexity ($COMPLEXITY) exceeds threshold (0.8)"
            exit 1
          else
            echo "✅ Specification complexity ($COMPLEXITY) within acceptable range"
          fi
```

## Best Practices

### 1. Environment-Specific Configuration

```yaml
# .eslrc.development.yaml
validation:
  strict: false
  allowExperimentalFeatures: true
  
sync:
  allowBreakingChanges: true
  backup: true
  
# .eslrc.production.yaml
validation:
  strict: true
  allowExperimentalFeatures: false
  
sync:
  allowBreakingChanges: false
  backup: true
  requireApproval: true
```

### 2. Automated Documentation

```yaml
# Update docs on specification changes
name: Update Documentation

on:
  push:
    paths:
      - 'specs/**/*.esl.yaml'
    branches: [ main ]

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      
      - name: Generate documentation
        run: |
          esl generate documentation specs/api.esl.yaml -o ./docs/generated
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/generated
```

### 3. Slack/Teams Integration

```yaml
# Notification on drift detection
      - name: Notify on drift
        if: steps.drift-check.outputs.drift-detected == 'true'
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": "⚠️ Specification drift detected in ${{ github.repository }}",
              "attachments": [{
                "color": "warning",
                "fields": [{
                  "title": "Branch",
                  "value": "${{ github.ref }}",
                  "short": true
                }, {
                  "title": "Author",
                  "value": "${{ github.actor }}",
                  "short": true
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

This CI/CD integration guide provides comprehensive coverage of integrating the ESL Framework into modern DevOps workflows. Choose the platform that matches your infrastructure and customize the workflows based on your specific requirements.

*For more advanced automation patterns, refer to the [Advanced Usage Guide](advanced-usage.md) and explore our [example CI/CD configurations](../examples/ci-cd/).*