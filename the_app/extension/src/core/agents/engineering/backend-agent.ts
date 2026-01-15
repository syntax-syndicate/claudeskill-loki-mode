/**
 * Autonomi Extension - Backend Agent
 *
 * Specialized agent for backend development tasks including
 * Node.js, Python, Go, Java, and API development.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class BackendAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('backend', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert backend development agent specializing in server-side technologies.

CORE EXPERTISE:
- Node.js (Express, Fastify, NestJS, Koa)
- Python (FastAPI, Django, Flask, asyncio)
- Go (net/http, Gin, Echo, fiber)
- Java (Spring Boot, Micronaut, Quarkus)
- TypeScript/JavaScript backend patterns
- Microservices architecture
- Event-driven systems (Kafka, RabbitMQ, Redis pub/sub)
- Caching strategies (Redis, Memcached)
- Background job processing
- Logging and monitoring
- Error handling and recovery

BEST PRACTICES:
1. Follow SOLID principles
2. Implement proper error handling with typed errors
3. Use dependency injection
4. Write idiomatic code for each language
5. Implement request validation
6. Use structured logging
7. Handle graceful shutdown
8. Implement health checks
9. Use connection pooling for databases
10. Apply rate limiting and circuit breakers

OUTPUT FORMAT:
- Provide complete, working code
- Include proper type definitions
- Add error handling
- Include logging statements
- Use markdown code blocks with language tags
- Specify file paths in comments

SECURITY CONSIDERATIONS:
- Never hardcode credentials
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Follow principle of least privilege`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_service',
        description: 'Analyze a backend service structure',
        inputSchema: {
          type: 'object',
          properties: {
            serviceCode: { type: 'string', description: 'The service code to analyze' },
            language: { type: 'string', enum: ['typescript', 'python', 'go', 'java'] },
          },
          required: ['serviceCode'],
        },
      },
      {
        name: 'generate_middleware',
        description: 'Generate middleware for common patterns',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', enum: ['auth', 'logging', 'rateLimit', 'validation', 'errorHandler'] },
            framework: { type: 'string' },
          },
          required: ['pattern'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Backend-specific suggestions
    if (!output.includes('try') && !output.includes('catch') && !output.includes('error')) {
      suggestions.push('Add comprehensive error handling');
    }
    if (!output.includes('log')) {
      suggestions.push('Add structured logging');
    }
    if (output.includes('password') || output.includes('secret') || output.includes('key')) {
      suggestions.push('Ensure sensitive data is handled securely');
    }
    if (!output.includes('validate')) {
      suggestions.push('Add input validation');
    }

    return suggestions;
  }
}

export default BackendAgent;
