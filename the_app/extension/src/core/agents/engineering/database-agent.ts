/**
 * Autonomi Extension - Database Agent
 *
 * Specialized agent for database tasks including
 * SQL, migrations, schema design, and query optimization.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class DatabaseAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('database', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert database agent specializing in data modeling and SQL.

CORE EXPERTISE:
- PostgreSQL (advanced features, extensions, PL/pgSQL)
- MySQL/MariaDB
- SQLite
- MongoDB (aggregation pipelines, indexes)
- Redis (data structures, Lua scripting)
- ORMs (Prisma, TypeORM, Sequelize, SQLAlchemy, GORM)
- Database migrations
- Query optimization and indexing
- Data modeling and normalization
- Transactions and isolation levels
- Replication and sharding strategies

BEST PRACTICES:
1. Design normalized schemas (3NF minimum)
2. Create appropriate indexes for query patterns
3. Use foreign keys for referential integrity
4. Write idempotent migrations
5. Include rollback scripts
6. Use transactions for multi-statement operations
7. Avoid N+1 queries
8. Use connection pooling
9. Implement soft deletes when appropriate
10. Add audit columns (created_at, updated_at)

OUTPUT FORMAT:
- Provide complete SQL or ORM code
- Include up and down migrations
- Add comments explaining complex queries
- Show index creation statements
- Include example queries
- Use markdown code blocks with sql/prisma/etc tags

MIGRATION SAFETY:
- Always provide reversible migrations
- Test migrations on copy of production data
- Consider data volume for ALTER TABLE operations
- Use online DDL when available
- Plan for zero-downtime deployments`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_schema',
        description: 'Analyze database schema for issues',
        inputSchema: {
          type: 'object',
          properties: {
            schema: { type: 'string', description: 'The schema SQL to analyze' },
            dbType: { type: 'string', enum: ['postgresql', 'mysql', 'sqlite', 'mongodb'] },
          },
          required: ['schema'],
        },
      },
      {
        name: 'optimize_query',
        description: 'Analyze and optimize a SQL query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The SQL query to optimize' },
            tableInfo: { type: 'string', description: 'Table schema information' },
          },
          required: ['query'],
        },
      },
      {
        name: 'generate_migration',
        description: 'Generate a database migration',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            changes: { type: 'string' },
            migrationTool: { type: 'string', enum: ['prisma', 'typeorm', 'sequelize', 'raw-sql'] },
          },
          required: ['description', 'changes'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // Database-specific warnings
    if (output.includes('DROP') || output.includes('TRUNCATE')) {
      warnings.push('DESTRUCTIVE OPERATION: Output contains DROP or TRUNCATE statements');
    }
    if (output.includes('ALTER TABLE') && !output.includes('-- rollback')) {
      warnings.push('ALTER TABLE detected - ensure rollback script is included');
    }
    if (output.includes('DELETE FROM') && !output.includes('WHERE')) {
      warnings.push('DELETE without WHERE clause detected - this will delete all rows');
    }
    if (output.includes('UPDATE') && !output.includes('WHERE')) {
      warnings.push('UPDATE without WHERE clause detected - this will update all rows');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    if (output.includes('CREATE TABLE')) {
      suggestions.push('Review indexes for common query patterns');
      suggestions.push('Add foreign key constraints if applicable');
    }
    if (output.includes('SELECT') && !output.includes('EXPLAIN')) {
      suggestions.push('Run EXPLAIN ANALYZE on queries with large datasets');
    }
    if (output.includes('migration')) {
      suggestions.push('Test migration on staging environment first');
    }

    return suggestions;
  }
}

export default DatabaseAgent;
