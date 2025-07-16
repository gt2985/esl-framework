// Simple JavaScript test without strict TypeScript compilation
const { ESLFramework } = require('./dist/index.js');

async function testESLParser() {
  const framework = new ESLFramework();
  
  const simpleESL = `
metadata:
  version: "1.0.0"
  id: "test-doc"
  title: "Test Document"
  description: "A simple test ESL document"

businessRules:
  - id: "rule1"
    name: "Test Rule"
    description: "A test business rule"
    condition: "user is authenticated"
    action: "allow access"
    priority: 1
    enabled: true
`;

  console.log('Testing ESL Parser...');
  
  try {
    const result = await framework.parseContent(simpleESL);
    console.log('Parse result:', {
      valid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      hasDocument: !!result.document
    });
    
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
    
    if (result.document) {
      console.log('Document metadata:', result.document.metadata);
      console.log('Business rules count:', result.document.businessRules?.length || 0);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testESLParser();