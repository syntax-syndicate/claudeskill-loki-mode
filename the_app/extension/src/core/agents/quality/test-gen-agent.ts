/**
 * Autonomi Extension - Test Generation Agent
 *
 * Specialized agent for generating unit tests,
 * achieving coverage targets, and test scaffolding.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class TestGenAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('test-gen', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Test generation needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert test generation agent focused on creating comprehensive test suites.

TESTING FRAMEWORKS:
- JavaScript/TypeScript: Jest, Vitest, Mocha, Jasmine
- Python: pytest, unittest
- Go: testing package, testify
- Java: JUnit 5, Mockito
- Rust: built-in test framework
- React: React Testing Library, Enzyme
- Vue: Vue Test Utils
- Angular: Jasmine, Karma

TEST GENERATION PRINCIPLES:
1. Follow AAA pattern (Arrange, Act, Assert)
2. Write descriptive test names
3. Test one behavior per test
4. Include positive and negative cases
5. Test edge cases and boundaries
6. Mock external dependencies
7. Ensure test isolation
8. Aim for high coverage of critical paths

TEST CATEGORIES TO GENERATE:
1. Happy Path Tests
   - Normal expected behavior
   - Valid inputs
   - Success scenarios

2. Edge Case Tests
   - Boundary values
   - Empty/null inputs
   - Maximum/minimum values

3. Error Case Tests
   - Invalid inputs
   - Exception handling
   - Error states

4. Integration Points
   - API calls (mocked)
   - Database operations (mocked)
   - External services (mocked)

OUTPUT FORMAT:
\`\`\`typescript
// test-file.test.ts

describe('ComponentOrFunction', () => {
  // Setup
  beforeEach(() => {
    // Test setup
  });

  describe('methodName', () => {
    it('should handle happy path correctly', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // Test edge case
    });

    it('should handle error case', () => {
      // Test error case
    });
  });
});
\`\`\`

Always generate complete, runnable tests with proper imports.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_coverage',
        description: 'Analyze code to identify uncovered paths',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            existingTests: { type: 'string', description: 'Existing tests if any' },
          },
          required: ['code'],
        },
      },
      {
        name: 'generate_test_data',
        description: 'Generate test data fixtures',
        inputSchema: {
          type: 'object',
          properties: {
            schema: { type: 'string', description: 'Data schema or type definition' },
            count: { type: 'number', description: 'Number of fixtures to generate' },
          },
          required: ['schema'],
        },
      },
      {
        name: 'create_mock',
        description: 'Create mock implementations',
        inputSchema: {
          type: 'object',
          properties: {
            interface: { type: 'string', description: 'Interface or class to mock' },
            framework: { type: 'string', enum: ['jest', 'vitest', 'sinon', 'mockito'] },
          },
          required: ['interface'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Test-specific suggestions
    if (!output.includes('mock') && !output.includes('Mock')) {
      suggestions.push('Consider adding mocks for external dependencies');
    }
    if (!output.includes('beforeEach') && !output.includes('beforeAll')) {
      suggestions.push('Add setup/teardown for test isolation');
    }
    if (!output.includes('throw') && !output.includes('error')) {
      suggestions.push('Add tests for error scenarios');
    }
    if (output.includes('async') && !output.includes('await')) {
      suggestions.push('Ensure async tests use await properly');
    }

    return suggestions;
  }
}

export default TestGenAgent;
