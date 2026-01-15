/**
 * Autonomi Extension - Migration Agent
 *
 * Specialized agent for migration tasks including
 * language/framework upgrades and version migrations.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class MigrationAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('migration', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Migrations need careful reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert migration agent focused on safe, complete migrations.

MIGRATION TYPES:

1. Version Upgrades
   - Major version updates (breaking changes)
   - Minor version updates (new features)
   - Security patch updates
   - Dependency updates

2. Framework Migrations
   - React class -> hooks
   - Vue Options API -> Composition API
   - Express -> Fastify
   - Angular version upgrades

3. Language Migrations
   - JavaScript -> TypeScript
   - Python 2 -> Python 3
   - CommonJS -> ES Modules
   - Node.js version upgrades

4. Infrastructure Migrations
   - Database migrations
   - Cloud provider migrations
   - Container orchestration changes
   - API versioning

MIGRATION PRINCIPLES:
1. Create comprehensive migration plan
2. Identify all breaking changes
3. Update dependencies in correct order
4. Migrate incrementally when possible
5. Maintain backward compatibility
6. Create rollback procedures
7. Test thoroughly at each step
8. Document all changes
9. Update related configurations
10. Verify no regressions

OUTPUT FORMAT:
## Migration Overview
- From: Current version/framework
- To: Target version/framework
- Impact: Files and features affected

## Breaking Changes
List all breaking changes to address

## Migration Steps
1. Step with specific instructions
2. Commands to run
3. Files to modify

## Code Changes

### File: path/to/file
\`\`\`language
// Updated code
\`\`\`

## Dependency Updates
\`\`\`json
// Package.json changes
\`\`\`

## Rollback Procedure
Steps to revert if needed

## Testing Checklist
- [ ] Test items to verify

Always provide complete migration scripts and updated code.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_dependencies',
        description: 'Analyze dependencies for migration impact',
        inputSchema: {
          type: 'object',
          properties: {
            packageFile: { type: 'string', description: 'Package.json, requirements.txt, etc.' },
            targetVersion: { type: 'string' },
          },
          required: ['packageFile'],
        },
      },
      {
        name: 'find_breaking_changes',
        description: 'Find breaking changes between versions',
        inputSchema: {
          type: 'object',
          properties: {
            library: { type: 'string' },
            fromVersion: { type: 'string' },
            toVersion: { type: 'string' },
          },
          required: ['library', 'fromVersion', 'toVersion'],
        },
      },
      {
        name: 'generate_codemod',
        description: 'Generate codemod transformation',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern to transform' },
            replacement: { type: 'string', description: 'Replacement pattern' },
          },
          required: ['pattern', 'replacement'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // Migration-specific warnings
    if (output.includes('breaking change') || output.includes('BREAKING')) {
      warnings.push('Breaking changes detected - thorough testing required');
    }
    if (!output.includes('## Rollback')) {
      warnings.push('No rollback procedure provided - add before proceeding');
    }
    if (output.includes('deprecated')) {
      warnings.push('Deprecated features used - may need additional updates');
    }
    if (output.includes('major') && output.includes('version')) {
      warnings.push('Major version upgrade - expect significant changes');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Migration-specific suggestions
    suggestions.push('Back up project before starting migration');
    suggestions.push('Run migration in development/staging first');
    suggestions.push('Update CI/CD pipeline for new versions');
    suggestions.push('Review and update documentation');
    suggestions.push('Notify team of migration changes');

    return suggestions;
  }
}

export default MigrationAgent;
