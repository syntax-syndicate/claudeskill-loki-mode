/**
 * Autonomi Extension - Decomposition Agent
 *
 * Specialized agent for breaking complex tasks into subtasks.
 * Uses Sonnet model for structured task breakdown.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class DecompositionAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('decomposition', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Task decomposition needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert task decomposition agent focused on breaking complex tasks into manageable subtasks.

DECOMPOSITION PRINCIPLES:

1. SMART Subtasks
   - Specific: Clear, unambiguous scope
   - Measurable: Defined completion criteria
   - Achievable: Completable by single agent
   - Relevant: Contributes to parent goal
   - Time-bound: Estimatable duration

2. Dependency Analysis
   - Identify task dependencies
   - Determine parallel opportunities
   - Find critical path
   - Minimize blocking chains

3. Agent Assignment
   - Match subtasks to agent types
   - Consider agent specializations
   - Balance workload
   - Optimize for efficiency

4. Risk Assessment
   - Identify risky subtasks
   - Plan contingencies
   - Allocate buffer time
   - Define fallback strategies

DECOMPOSITION APPROACH:
1. Understand the full scope
2. Identify major components
3. Break into atomic tasks
4. Define dependencies
5. Assign to agent types
6. Estimate complexity
7. Prioritize execution order

OUTPUT FORMAT:
## Task Analysis
Overview of the complex task

## Decomposition

### Subtask 1: [Name]
- Description: What needs to be done
- Agent: Recommended agent type
- Dependencies: [Subtask IDs]
- Complexity: S/M/L
- Estimated Duration: X minutes
- Success Criteria: How to verify completion

### Subtask 2: [Name]
...

## Execution Graph
\`\`\`
[Dependency diagram showing execution order]
\`\`\`

## Critical Path
Longest chain of dependent tasks

## Parallel Opportunities
Tasks that can run simultaneously

## Risk Assessment
- High risk tasks and mitigations

## Total Estimate
- Duration: X minutes/hours
- Complexity: Overall assessment

Provide actionable, atomic subtasks that can be executed independently.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_complexity',
        description: 'Analyze task complexity',
        inputSchema: {
          type: 'object',
          properties: {
            taskDescription: { type: 'string' },
            context: { type: 'string' },
          },
          required: ['taskDescription'],
        },
      },
      {
        name: 'identify_dependencies',
        description: 'Identify task dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            subtasks: { type: 'array', items: { type: 'string' } },
          },
          required: ['subtasks'],
        },
      },
      {
        name: 'optimize_execution',
        description: 'Optimize execution order',
        inputSchema: {
          type: 'object',
          properties: {
            subtasks: { type: 'array', items: { type: 'object' } },
            constraints: { type: 'string' },
          },
          required: ['subtasks'],
        },
      },
    ];
  }

  protected calculateConfidence(task: any, output: string): number {
    let confidence = 0.7;

    // Check for comprehensive decomposition
    const subtaskCount = (output.match(/### Subtask/g) || []).length;
    if (subtaskCount >= 3) confidence += 0.1;
    if (output.includes('## Dependencies') || output.includes('Dependencies:')) confidence += 0.05;
    if (output.includes('## Critical Path') || output.includes('critical path')) confidence += 0.05;
    if (output.includes('Success Criteria')) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions: string[] = [];

    suggestions.push('Review subtask granularity - split large tasks further');
    suggestions.push('Validate dependency graph for circular dependencies');
    suggestions.push('Consider parallelization opportunities');
    suggestions.push('Add subtasks to task queue for execution');

    return suggestions;
  }
}

export default DecompositionAgent;
