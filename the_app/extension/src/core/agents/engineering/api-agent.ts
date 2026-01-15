/**
 * Autonomi Extension - API Agent
 *
 * Specialized agent for API development including
 * REST, GraphQL, and OpenAPI specification.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class ApiAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('api', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert API development agent specializing in modern API design.

CORE EXPERTISE:
- REST API design (Richardson Maturity Model Level 3)
- GraphQL (schemas, resolvers, subscriptions, federation)
- OpenAPI/Swagger specification (3.0+)
- gRPC and Protocol Buffers
- API versioning strategies
- Authentication (OAuth2, JWT, API keys)
- Rate limiting and quotas
- Pagination patterns (cursor, offset, keyset)
- Caching (ETags, Cache-Control)
- HATEOAS and hypermedia

BEST PRACTICES:
1. Design resource-oriented APIs
2. Use proper HTTP methods and status codes
3. Implement consistent error responses
4. Version APIs appropriately
5. Document with OpenAPI spec
6. Use plural nouns for collections
7. Implement proper pagination
8. Support filtering, sorting, field selection
9. Use HTTPS always
10. Implement proper CORS policies

OUTPUT FORMAT:
- Provide complete API specifications
- Include request/response examples
- Add OpenAPI/Swagger definitions
- Include error response schemas
- Show curl examples for testing
- Use appropriate code blocks

HTTP STATUS CODES:
- 200: Success with body
- 201: Created (POST/PUT)
- 204: Success no content (DELETE)
- 400: Bad request (client error)
- 401: Unauthorized (auth required)
- 403: Forbidden (no permission)
- 404: Not found
- 409: Conflict
- 422: Unprocessable entity
- 429: Too many requests
- 500: Internal server error`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'generate_openapi',
        description: 'Generate OpenAPI specification',
        inputSchema: {
          type: 'object',
          properties: {
            endpoints: { type: 'string', description: 'Description of API endpoints' },
            baseUrl: { type: 'string' },
            version: { type: 'string' },
          },
          required: ['endpoints'],
        },
      },
      {
        name: 'validate_api_design',
        description: 'Validate API design against best practices',
        inputSchema: {
          type: 'object',
          properties: {
            spec: { type: 'string', description: 'OpenAPI spec or endpoint definitions' },
          },
          required: ['spec'],
        },
      },
      {
        name: 'generate_graphql_schema',
        description: 'Generate GraphQL schema',
        inputSchema: {
          type: 'object',
          properties: {
            types: { type: 'string', description: 'Description of types and relationships' },
          },
          required: ['types'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // API-specific suggestions
    if (output.includes('POST') || output.includes('PUT')) {
      suggestions.push('Add request body validation schemas');
    }
    if (!output.includes('error') && !output.includes('Error')) {
      suggestions.push('Define error response schemas');
    }
    if (!output.includes('auth') && !output.includes('bearer')) {
      suggestions.push('Consider authentication requirements');
    }
    if (output.includes('GET') && output.includes('list')) {
      suggestions.push('Implement pagination for list endpoints');
    }

    return suggestions;
  }
}

export default ApiAgent;
