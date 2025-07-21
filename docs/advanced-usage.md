# Advanced Usage Guide

This guide covers advanced features and patterns for using the ESL Framework in complex enterprise scenarios.

## Table of Contents

- [Advanced Specification Patterns](#advanced-specification-patterns)
- [Enterprise-Scale Development](#enterprise-scale-development)
- [Advanced Sync Strategies](#advanced-sync-strategies)
- [AI Context Optimization](#ai-context-optimization)
- [Custom Templates and Generators](#custom-templates-and-generators)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Advanced Specification Patterns

### Inheritance and Composition

```yaml
# Base specification
eslVersion: "1.0.0"
project:
  name: "Base System"

dataModels:
  BaseEntity:
    properties:
      id: { type: string, required: true }
      createdAt: { type: Date, required: true }
      updatedAt: { type: Date, required: true }

# Extended specification
eslVersion: "1.0.0"
extends: ["./base-system.esl.yaml"]

dataModels:
  User:
    extends: BaseEntity
    properties:
      name: { type: string, required: true }
      email: { type: string, required: true }
      
  Product:
    extends: BaseEntity
    properties:
      title: { type: string, required: true }
      price: { type: number, required: true }
```

### Complex Business Rules

```yaml
businessRules:
  userValidation:
    condition: "user.age >= 18 && user.email.includes('@')"
    action: "allowRegistration(user)"
    priority: 1
    exceptions:
      - condition: "user.parentalConsent === true"
        action: "allowMinorRegistration(user)"
    
  pricingRule:
    condition: "order.items.length > 5"
    action: "applyBulkDiscount(order, 0.1)"
    dependencies: ["userValidation"]
    
  dataRetention:
    condition: "user.lastLogin < Date.now() - (365 * 24 * 60 * 60 * 1000)"
    action: "scheduleDataDeletion(user)"
    schedule: "0 0 * * 0" # Weekly cron
```

### Multi-Service Architecture

```yaml
services:
  UserService:
    methods:
      createUser:
        parameters:
          - name: userData
            type: User
        returns: User
        businessRules: ["userValidation"]
        
      getUserById:
        parameters:
          - name: id
            type: string
        returns: User
        caching:
          ttl: 300 # 5 minutes
          
  OrderService:
    dependencies: ["UserService"]
    methods:
      createOrder:
        parameters:
          - name: orderData
            type: Order
          - name: userId
            type: string
        returns: Order
        businessRules: ["pricingRule"]
        transactions: true
        
  NotificationService:
    methods:
      sendEmail:
        parameters:
          - name: to
            type: string
          - name: subject
            type: string
          - name: body
            type: string
        returns: void
        async: true
```

## Enterprise-Scale Development

### Multi-Team Collaboration

```yaml
# team-a/user-service.esl.yaml
eslVersion: "1.0.0"
project:
  name: "User Service"
  team: "Team A"
  
exports:
  - User
  - UserService

dataModels:
  User:
    properties:
      id: { type: string, required: true }
      name: { type: string, required: true }
      email: { type: string, required: true }

# team-b/order-service.esl.yaml
eslVersion: "1.0.0"
project:
  name: "Order Service"
  team: "Team B"
  
imports:
  - from: "../team-a/user-service.esl.yaml"
    imports: ["User"]

dataModels:
  Order:
    properties:
      id: { type: string, required: true }
      userId: { type: User.id, required: true }
      items: { type: OrderItem[], required: true }
```

### Governance and Compliance

```yaml
governance:
  approvalRequired: true
  reviewers:
    - "architect@company.com"
    - "security@company.com"
    
  compliance:
    gdpr:
      enabled: true
      dataSubjectRights: true
      consentRequired: ["User.email", "User.phone"]
      
    hipaa:
      enabled: false
      
  auditLog:
    enabled: true
    events: ["create", "update", "delete"]
    retention: "7 years"
    
  securityRules:
    - name: "No PII in logs"
      pattern: "password|ssn|credit_card"
      action: "reject"
      
    - name: "Encryption required"
      condition: "field.sensitive === true"
      action: "require_encryption"
```

### Version Management

```yaml
eslVersion: "1.0.0"
project:
  name: "API Service"
  version: "2.1.0"
  
versioning:
  strategy: "semantic"
  breaking_changes:
    - "Removed User.age field"
    - "Changed Order.total type from number to Money"
    
  migration:
    from: "2.0.0"
    to: "2.1.0"
    scripts:
      - "migrate_user_age.sql"
      - "convert_order_totals.js"
      
  deprecation:
    - field: "User.legacyId"
      version: "2.0.0"
      removal: "3.0.0"
      replacement: "User.id"
```

## Advanced Sync Strategies

### Selective Synchronization

```bash
# Sync only specific components
esl sync api.esl.yaml ./src --include models,services
esl sync api.esl.yaml ./src --exclude controllers,tests

# Sync with custom filters
esl sync api.esl.yaml ./src --filter "*.service.ts,*.model.ts"

# Sync specific services
esl sync api.esl.yaml ./src --services UserService,OrderService
```

### Conflict Resolution

```yaml
# .eslrc.yaml
sync:
  conflictResolution:
    strategy: "merge" # merge, replace, skip, interactive
    
  mergeRules:
    - pattern: "*.service.ts"
      strategy: "preserve_implementations"
      
    - pattern: "*.model.ts"
      strategy: "replace"
      
    - pattern: "*.test.ts"
      strategy: "skip"
      
  backupStrategy:
    enabled: true
    location: "./backups"
    retention: "30 days"
```

### Multi-Environment Sync

```bash
# Development environment
esl sync api.esl.yaml ./src --env development --allow-breaking

# Staging environment
esl sync api.esl.yaml ./src --env staging --strict

# Production environment
esl sync api.esl.yaml ./src --env production --read-only --validate-only
```

## AI Context Optimization

### Advanced Chunking Strategies

```bash
# Semantic chunking with relationship preservation
esl context chunk api.esl.yaml \
  --strategy semantic \
  --preserve-relationships \
  --max-chunk-size 2000 \
  --overlap 200

# Business domain chunking
esl context chunk api.esl.yaml \
  --strategy business_domain \
  --domains "user,order,payment" \
  --max-chunk-size 2500

# Adaptive chunking based on complexity
esl context chunk api.esl.yaml \
  --strategy adaptive \
  --complexity-threshold 0.8 \
  --auto-adjust-size
```

### Model-Specific Optimization

```yaml
# .eslrc.yaml
context:
  models:
    gpt-4:
      maxTokens: 8192
      compressionLevel: "medium"
      format: "structured"
      priorityFields: ["businessRules", "dataStructures"]
      
    claude-3:
      maxTokens: 100000
      compressionLevel: "low"
      format: "verbose"
      includeExamples: true
      
    gemini-pro:
      maxTokens: 32768
      compressionLevel: "high"
      format: "multimodal"
      includeDiagrams: true
```

### Custom Context Processors

```typescript
// custom-processor.ts
import { ContextProcessor, ProcessingContext } from 'esl-framework';

class CustomBusinessProcessor implements ContextProcessor {
  name = 'custom-business-processor';
  
  async process(context: ProcessingContext): Promise<ProcessingContext> {
    // Custom business logic processing
    const businessRules = context.document.businessRules || [];
    
    // Group related rules
    const groupedRules = this.groupByDomain(businessRules);
    
    // Add business context
    context.metadata.businessContext = {
      domains: Object.keys(groupedRules),
      complexity: this.calculateComplexity(groupedRules),
      relationships: this.extractRelationships(groupedRules)
    };
    
    return context;
  }
  
  private groupByDomain(rules: BusinessRule[]): Record<string, BusinessRule[]> {
    // Implementation
  }
  
  private calculateComplexity(groupedRules: any): number {
    // Implementation
  }
  
  private extractRelationships(groupedRules: any): any[] {
    // Implementation
  }
}

// Register the processor
const contextManager = new ContextManager();
contextManager.registerProcessor(new CustomBusinessProcessor());
```

## Custom Templates and Generators

### Creating Custom Templates

```typescript
// templates/custom-service.hbs
{{#each services}}
/**
 * {{name}} - {{description}}
 * Generated by ESL Framework
 */
export class {{name}} {
  {{#each methods}}
  /**
   * {{description}}
   {{#each parameters}}
   * @param {{name}} - {{description}}
   {{/each}}
   * @returns {{returns.type}}
   */
  async {{name}}({{#each parameters}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}): Promise<{{returns.type}}> {
    // TODO: Implement {{name}}
    throw new Error('Method not implemented: {{name}}');
  }
  {{/each}}
}
{{/each}}
```

### Custom Generator

```typescript
// generators/custom-generator.ts
import { CodeGenerator, GenerationContext } from 'esl-framework';

export class CustomServiceGenerator extends CodeGenerator {
  name = 'custom-service';
  
  async generate(context: GenerationContext): Promise<string> {
    const template = await this.loadTemplate('custom-service.hbs');
    
    return template({
      services: context.document.services,
      metadata: context.metadata,
      options: context.options
    });
  }
  
  getOutputPath(context: GenerationContext): string {
    return `${context.outputDir}/services/custom-services.ts`;
  }
}

// Register and use
const generator = new CustomServiceGenerator();
esl.registerGenerator(generator);
```

## Performance Optimization

### Caching Strategies

```yaml
# .eslrc.yaml
performance:
  caching:
    enabled: true
    strategy: "memory" # memory, disk, redis
    
    memory:
      maxSize: "100MB"
      ttl: "1h"
      
    disk:
      location: "./.esl-cache"
      compression: true
      
    redis:
      host: "localhost"
      port: 6379
      db: 0
```

### Parallel Processing

```bash
# Enable parallel processing
esl sync api.esl.yaml ./src --parallel --workers 4

# Parallel validation
esl validate specs/**/*.esl.yaml --parallel --max-concurrent 8

# Parallel context creation
esl context create api.esl.yaml --parallel-chunks --chunk-workers 6
```

### Memory Management

```yaml
# .eslrc.yaml
performance:
  memory:
    maxHeapSize: "2GB"
    streaming:
      enabled: true
      chunkSize: 1000
      
  largeDocs:
    streamingThreshold: "10MB"
    compressionEnabled: true
    
  monitoring:
    enabled: true
    reportInterval: "5min"
```

## Troubleshooting

### Debug Mode

```bash
# Enable comprehensive debugging
DEBUG=esl:* esl command --verbose

# Debug specific modules
DEBUG=esl:sync,esl:context esl sync api.esl.yaml ./src

# Performance profiling
NODE_ENV=development esl sync api.esl.yaml ./src --profile
```

### Common Issues

#### Large Specification Performance

```bash
# Use streaming for large specs
esl context stream large-spec.esl.yaml --chunk-size 1000

# Enable compression
esl context create large-spec.esl.yaml --compression high

# Use selective processing
esl sync large-spec.esl.yaml ./src --include models --exclude tests
```

#### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" esl sync large-spec.esl.yaml ./src

# Use streaming mode
esl context stream large-spec.esl.yaml --memory-limit 1GB
```

#### Sync Conflicts

```bash
# Use interactive resolution
esl sync api.esl.yaml ./src --interactive

# Force resolution with backup
esl sync api.esl.yaml ./src --force --backup

# Custom conflict resolution
esl sync api.esl.yaml ./src --resolve-conflicts merge
```

### Monitoring and Metrics

```typescript
// monitoring.ts
import { ESLFramework, PerformanceMonitor } from 'esl-framework';

const monitor = new PerformanceMonitor({
  enabled: true,
  reportInterval: 60000, // 1 minute
  metrics: ['memory', 'cpu', 'operations']
});

const framework = new ESLFramework({
  monitor: monitor
});

// Custom metrics
monitor.track('custom_operation', async () => {
  // Your operation
});

// Export metrics
const metrics = await monitor.getMetrics();
console.log(JSON.stringify(metrics, null, 2));
```

## Best Practices

### 1. Specification Organization

```
specs/
├── core/
│   ├── base-entities.esl.yaml
│   └── common-types.esl.yaml
├── services/
│   ├── user-service.esl.yaml
│   ├── order-service.esl.yaml
│   └── payment-service.esl.yaml
├── apis/
│   ├── public-api.esl.yaml
│   └── admin-api.esl.yaml
└── governance/
    ├── compliance.esl.yaml
    └── security-rules.esl.yaml
```

### 2. CI/CD Integration

```yaml
# .github/workflows/esl-validation.yml
name: ESL Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g esl-framework
      - run: esl validate specs/**/*.esl.yaml --strict
      - run: esl diff specs/api.esl.yaml ./src --format json
```

### 3. Team Workflows

```bash
# Developer workflow
esl validate my-spec.esl.yaml --strict
esl diff my-spec.esl.yaml ./src --interactive
esl sync my-spec.esl.yaml ./src --dry-run
git add . && git commit -m "Update specification"

# Review workflow
esl validate pr-spec.esl.yaml --governance
esl diff pr-spec.esl.yaml ./src --format markdown > review.md
```

---

This advanced usage guide covers the sophisticated features of the ESL Framework for enterprise-scale development. For specific implementation details, refer to the [API Reference](api-reference.md) and explore the [examples](../examples/) directory.

*For community support and advanced topics, visit our [GitHub Discussions](https://github.com/gt2985/esl-framework/discussions).*