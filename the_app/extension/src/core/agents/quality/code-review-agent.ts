/**
 * Autonomi Extension - Code Review Agent
 *
 * Specialized agent for code review tasks including
 * code quality, patterns, and maintainability analysis.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class CodeReviewAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('code-review', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Code review needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert code review agent focused on code quality and maintainability.

REVIEW FOCUS AREAS:
1. Code Quality
   - Clean code principles
   - SOLID principles adherence
   - DRY (Don't Repeat Yourself)
   - Single responsibility
   - Proper naming conventions

2. Maintainability
   - Code readability
   - Documentation quality
   - Complexity metrics
   - Module coupling
   - Test coverage

3. Best Practices
   - Language idioms
   - Framework patterns
   - Error handling
   - Logging practices
   - Configuration management

4. Potential Issues
   - Logic errors
   - Edge cases
   - Race conditions
   - Memory leaks
   - Performance bottlenecks

REVIEW OUTPUT FORMAT:
## Summary
Brief overview of the code quality

## Critical Issues
Issues that MUST be fixed before merge
- [CRITICAL] Description with line reference

## Warnings
Issues that SHOULD be addressed
- [WARNING] Description with line reference

## Suggestions
Improvements that COULD enhance the code
- [SUGGESTION] Description with line reference

## Positive Highlights
Good practices observed
- [GOOD] Description

## Verdict
APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION

Always be constructive and provide specific improvement suggestions.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_complexity',
        description: 'Analyze code complexity metrics',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            language: { type: 'string' },
          },
          required: ['code'],
        },
      },
      {
        name: 'check_patterns',
        description: 'Check for common anti-patterns',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
            framework: { type: 'string' },
          },
          required: ['code'],
        },
      },
      {
        name: 'suggest_refactoring',
        description: 'Suggest code refactoring improvements',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            targetImprovement: { type: 'string', enum: ['readability', 'performance', 'testability', 'maintainability'] },
          },
          required: ['code'],
        },
      },
    ];
  }

  protected calculateConfidence(task: any, output: string): number {
    let confidence = super.calculateConfidence(task, output);

    // Boost confidence if review is comprehensive
    if (output.includes('## Summary') && output.includes('## Verdict')) {
      confidence += 0.1;
    }
    if (output.includes('[CRITICAL]') || output.includes('[WARNING]')) {
      confidence += 0.05; // Found issues = thorough review
    }

    return Math.min(1.0, confidence);
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions: string[] = [];

    if (output.includes('REQUEST_CHANGES')) {
      suggestions.push('Address critical issues before re-review');
    }
    if (output.includes('[CRITICAL]')) {
      suggestions.push('Fix all critical issues immediately');
    }
    if (output.includes('test coverage')) {
      suggestions.push('Improve test coverage for flagged areas');
    }
    if (output.includes('documentation')) {
      suggestions.push('Add missing documentation');
    }

    return suggestions;
  }
}

export default CodeReviewAgent;
