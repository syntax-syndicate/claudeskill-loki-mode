/**
 * Autonomi Extension - QA Agent
 *
 * Specialized agent for quality assurance tasks including
 * test strategy, E2E testing, and integration testing.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class QAAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('qa', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert QA agent specializing in software testing strategies.

CORE EXPERTISE:
- Test strategy and planning
- E2E testing (Playwright, Cypress, Selenium)
- Integration testing
- API testing (Postman, REST-assured)
- Performance testing (k6, JMeter, Locust)
- Mobile testing (Appium, Detox)
- Accessibility testing (axe, pa11y)
- Visual regression testing (Percy, Chromatic)
- Test automation frameworks
- BDD/TDD methodologies

BEST PRACTICES:
1. Follow testing pyramid (unit > integration > E2E)
2. Write deterministic tests (no flaky tests)
3. Use page object model for E2E tests
4. Implement proper test data management
5. Use meaningful test names
6. Follow AAA pattern (Arrange, Act, Assert)
7. Mock external dependencies appropriately
8. Implement proper test isolation
9. Use parallel test execution
10. Implement proper CI integration

OUTPUT FORMAT:
- Provide complete test code
- Include setup and teardown
- Add assertions with meaningful messages
- Include test data fixtures
- Show test configuration
- Use appropriate test framework syntax

TEST COVERAGE GUIDELINES:
- Critical paths: 100% coverage
- Business logic: 80%+ coverage
- UI components: Key interactions covered
- API endpoints: All response codes covered
- Error scenarios: Edge cases tested`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'generate_test_plan',
        description: 'Generate comprehensive test plan',
        inputSchema: {
          type: 'object',
          properties: {
            feature: { type: 'string', description: 'Feature to test' },
            requirements: { type: 'string' },
            testTypes: { type: 'array', items: { type: 'string' } },
          },
          required: ['feature'],
        },
      },
      {
        name: 'generate_e2e_test',
        description: 'Generate E2E test code',
        inputSchema: {
          type: 'object',
          properties: {
            scenario: { type: 'string' },
            framework: { type: 'string', enum: ['playwright', 'cypress', 'selenium'] },
            steps: { type: 'array', items: { type: 'string' } },
          },
          required: ['scenario', 'framework'],
        },
      },
      {
        name: 'analyze_test_coverage',
        description: 'Analyze test coverage gaps',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            existingTests: { type: 'string', description: 'Existing test code' },
          },
          required: ['code'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // QA-specific suggestions
    if (output.includes('test(') || output.includes('it(')) {
      suggestions.push('Add negative test cases for error scenarios');
      suggestions.push('Consider boundary value testing');
    }
    if (!output.includes('beforeEach') && !output.includes('beforeAll')) {
      suggestions.push('Add proper test setup/teardown');
    }
    if (output.includes('async') && !output.includes('await')) {
      suggestions.push('Ensure async operations are properly awaited');
    }
    if (!output.includes('screenshot') && output.includes('page')) {
      suggestions.push('Add screenshot capture on test failure');
    }

    return suggestions;
  }
}

export default QAAgent;
