/**
 * Autonomi Extension - Documentation Agent
 *
 * Specialized agent for documentation tasks including
 * README files, API documentation, and code comments.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class DocsAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('docs', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Documentation needs good writing
  }

  getSystemPrompt(): string {
    return `You are an expert documentation agent focused on clear, comprehensive documentation.

DOCUMENTATION TYPES:

1. README Documentation
   - Project overview
   - Installation instructions
   - Quick start guide
   - Usage examples
   - Configuration options
   - Contributing guidelines

2. API Documentation
   - Endpoint descriptions
   - Request/response examples
   - Parameter documentation
   - Error codes and handling
   - Authentication details

3. Code Documentation
   - JSDoc/TSDoc comments
   - Python docstrings
   - Go doc comments
   - Inline explanations
   - Architecture decision records (ADRs)

4. User Documentation
   - Getting started guides
   - Feature documentation
   - FAQ sections
   - Troubleshooting guides

DOCUMENTATION PRINCIPLES:
1. Write for your audience
2. Use clear, concise language
3. Include practical examples
4. Keep documentation up-to-date
5. Use consistent formatting
6. Add visuals when helpful
7. Include code snippets
8. Document edge cases
9. Provide search-friendly headings
10. Cross-reference related docs

OUTPUT FORMAT:
Use appropriate markdown formatting:
- Clear headings hierarchy
- Code blocks with syntax highlighting
- Tables for structured data
- Lists for step-by-step instructions
- Links to related resources

Example JSDoc:
\`\`\`typescript
/**
 * Brief description of the function
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * // Example usage
 * const result = functionName(input);
 */
\`\`\`

Always provide complete, copy-paste ready documentation.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'generate_readme',
        description: 'Generate README documentation',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string' },
            description: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } },
            installation: { type: 'string' },
          },
          required: ['projectName'],
        },
      },
      {
        name: 'generate_jsdoc',
        description: 'Generate JSDoc/TSDoc comments',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to document' },
            style: { type: 'string', enum: ['jsdoc', 'tsdoc', 'google', 'numpy'] },
          },
          required: ['code'],
        },
      },
      {
        name: 'generate_api_docs',
        description: 'Generate API documentation',
        inputSchema: {
          type: 'object',
          properties: {
            endpoints: { type: 'string', description: 'API endpoints to document' },
            format: { type: 'string', enum: ['markdown', 'openapi', 'postman'] },
          },
          required: ['endpoints'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Documentation-specific suggestions
    if (!output.includes('## Example') && !output.includes('```')) {
      suggestions.push('Add code examples to documentation');
    }
    if (!output.includes('## Install') && !output.includes('npm install')) {
      suggestions.push('Add installation instructions');
    }
    if (output.includes('API') && !output.includes('curl')) {
      suggestions.push('Add curl examples for API endpoints');
    }

    return suggestions;
  }
}

export default DocsAgent;
