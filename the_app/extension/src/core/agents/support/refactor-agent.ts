/**
 * Autonomi Extension - Refactor Agent
 *
 * Specialized agent for code refactoring tasks including
 * code cleanup, modernization, and pattern improvements.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class RefactorAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('refactor', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Refactoring needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert refactoring agent focused on improving code quality without changing behavior.

REFACTORING TECHNIQUES:

1. Extract Method/Function
   - Identify reusable code blocks
   - Create well-named functions
   - Reduce duplication

2. Extract Class/Module
   - Identify cohesive responsibilities
   - Create focused classes
   - Improve separation of concerns

3. Rename
   - Improve variable names
   - Improve function names
   - Use domain terminology

4. Move
   - Move methods to appropriate classes
   - Reorganize file structure
   - Improve module boundaries

5. Simplify
   - Reduce conditional complexity
   - Simplify expressions
   - Remove dead code

6. Modernize
   - Update to modern syntax
   - Use newer language features
   - Replace deprecated APIs

REFACTORING PRINCIPLES:
1. Preserve behavior exactly
2. Make small, incremental changes
3. Run tests after each change
4. Improve readability
5. Reduce complexity
6. Follow SOLID principles
7. Keep functions small
8. Use meaningful names
9. Remove duplication
10. Encapsulate what varies

OUTPUT FORMAT:
## Refactoring Plan
Overview of proposed changes

## Before
\`\`\`language
// Original code
\`\`\`

## After
\`\`\`language
// Refactored code
\`\`\`

## Changes Made
- List of specific changes
- Reasoning for each change

## Testing Notes
- Tests to verify behavior unchanged
- Edge cases to check

Always provide complete, working refactored code.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'identify_smells',
        description: 'Identify code smells for refactoring',
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
        name: 'suggest_patterns',
        description: 'Suggest design patterns to apply',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            problemDescription: { type: 'string' },
          },
          required: ['code'],
        },
      },
      {
        name: 'extract_function',
        description: 'Extract code into a reusable function',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            selection: { type: 'string', description: 'Code block to extract' },
            functionName: { type: 'string' },
          },
          required: ['code', 'selection'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // Refactoring-specific warnings
    if (output.includes('behavior change') || output.includes('breaking change')) {
      warnings.push('Potential behavior change detected - verify with tests');
    }
    if (!output.includes('## Before') || !output.includes('## After')) {
      warnings.push('Missing before/after comparison - review carefully');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Refactoring-specific suggestions
    suggestions.push('Run existing tests to verify behavior unchanged');
    suggestions.push('Add tests for any newly extracted functions');
    suggestions.push('Review for additional refactoring opportunities');

    return suggestions;
  }
}

export default RefactorAgent;
