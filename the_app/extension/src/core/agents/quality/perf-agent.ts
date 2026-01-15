/**
 * Autonomi Extension - Performance Agent
 *
 * Specialized agent for performance analysis and optimization
 * including profiling, bottleneck detection, and optimization.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class PerfAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('perf', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Performance analysis needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert performance analysis agent focused on optimization.

PERFORMANCE ANALYSIS AREAS:

1. Time Complexity
   - Algorithm efficiency (Big O)
   - Loop optimization
   - Recursive vs iterative
   - Early exit opportunities

2. Space Complexity
   - Memory allocation patterns
   - Data structure choices
   - Memory leaks
   - Garbage collection pressure

3. I/O Performance
   - Database query optimization
   - N+1 query detection
   - Connection pooling
   - Caching opportunities
   - Batch operations

4. Concurrency
   - Parallel processing opportunities
   - Race conditions
   - Lock contention
   - Async/await patterns

5. Frontend Performance
   - Bundle size
   - Render performance
   - Memory leaks (listeners, subscriptions)
   - Lazy loading opportunities

PERFORMANCE REVIEW OUTPUT FORMAT:
## Performance Summary
Overall performance assessment

## Critical Bottlenecks
Must optimize - significant impact
- [CRITICAL] Description
  - Location: file:line
  - Current: Estimated current performance
  - Target: Expected improvement
  - Solution: Optimization approach

## Optimization Opportunities
Should consider
- [OPTIMIZE] Description
  - Location: file:line
  - Impact: High/Medium/Low
  - Effort: High/Medium/Low
  - Solution: Suggested optimization

## Complexity Analysis
- Time Complexity: O(?)
- Space Complexity: O(?)
- Bottleneck Analysis

## Recommendations
Prioritized list of optimizations

Always provide specific, actionable optimization suggestions with code examples.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_complexity',
        description: 'Analyze time and space complexity',
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
        name: 'detect_n_plus_one',
        description: 'Detect N+1 query patterns',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            orm: { type: 'string', enum: ['prisma', 'typeorm', 'sequelize', 'sqlalchemy', 'gorm'] },
          },
          required: ['code'],
        },
      },
      {
        name: 'suggest_caching',
        description: 'Suggest caching strategies',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            accessPattern: { type: 'string', description: 'How data is accessed' },
          },
          required: ['code'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // Performance-specific warnings
    if (output.includes('O(n^2)') || output.includes('O(n2)')) {
      warnings.push('Quadratic time complexity detected - may not scale well');
    }
    if (output.includes('O(n!)') || output.includes('O(2^n)')) {
      warnings.push('Exponential complexity detected - critical performance issue');
    }
    if (output.includes('N+1')) {
      warnings.push('N+1 query pattern detected - database performance issue');
    }
    if (output.includes('memory leak')) {
      warnings.push('Potential memory leak identified');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Performance-specific suggestions
    if (output.includes('[CRITICAL]')) {
      suggestions.push('Address critical bottlenecks before deployment');
      suggestions.push('Add performance tests for critical paths');
    }
    if (output.includes('caching')) {
      suggestions.push('Implement suggested caching strategy');
      suggestions.push('Set up cache invalidation logic');
    }
    if (output.includes('index')) {
      suggestions.push('Create database indexes for slow queries');
    }
    if (output.includes('batch')) {
      suggestions.push('Implement batch processing for bulk operations');
    }

    return suggestions;
  }
}

export default PerfAgent;
