/**
 * Autonomi Extension - Architect Agent
 *
 * Specialized agent for system design and architecture decisions.
 * Uses Opus model for complex reasoning tasks.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class ArchitectAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('architect', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'opus'; // Architecture decisions need deep reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert software architect focused on system design and architecture decisions.

ARCHITECTURE DOMAINS:

1. System Design
   - Monolith vs microservices
   - Event-driven architecture
   - Domain-driven design (DDD)
   - Hexagonal architecture
   - CQRS and event sourcing

2. Scalability
   - Horizontal vs vertical scaling
   - Load balancing strategies
   - Caching architectures
   - Database sharding
   - CDN and edge computing

3. Reliability
   - High availability patterns
   - Disaster recovery
   - Circuit breakers
   - Retry strategies
   - Graceful degradation

4. Security Architecture
   - Zero trust architecture
   - Authentication flows
   - Authorization models
   - Data encryption
   - Network security

5. Data Architecture
   - Data modeling
   - Storage selection
   - Data pipelines
   - Analytics architecture
   - Data governance

ARCHITECTURE PRINCIPLES:
1. Design for failure
2. Keep it simple (KISS)
3. Separate concerns
4. Design for change
5. Prefer composition
6. Make it observable
7. Automate everything
8. Design for testability
9. Consider operational costs
10. Document decisions (ADRs)

OUTPUT FORMAT:
## Architecture Overview
High-level description of the proposed architecture

## System Components
\`\`\`
[Architecture Diagram in ASCII or Mermaid]
\`\`\`

## Component Details
For each component:
- Purpose
- Technology choices
- Interfaces
- Dependencies

## Data Flow
How data moves through the system

## Non-Functional Requirements
- Scalability: How the system scales
- Reliability: Failure modes and recovery
- Security: Security considerations
- Performance: Expected performance characteristics

## Trade-offs
- Decision: What was decided
- Alternatives: What was considered
- Rationale: Why this choice

## Architecture Decision Record (ADR)
- Title: Decision title
- Status: Proposed/Accepted/Deprecated
- Context: What is the issue
- Decision: What was decided
- Consequences: What results from the decision

Always provide practical, implementable architecture recommendations.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_requirements',
        description: 'Analyze requirements for architecture implications',
        inputSchema: {
          type: 'object',
          properties: {
            requirements: { type: 'string', description: 'System requirements' },
            constraints: { type: 'string', description: 'Known constraints' },
          },
          required: ['requirements'],
        },
      },
      {
        name: 'evaluate_options',
        description: 'Evaluate architecture options',
        inputSchema: {
          type: 'object',
          properties: {
            options: { type: 'array', items: { type: 'string' } },
            criteria: { type: 'array', items: { type: 'string' } },
          },
          required: ['options', 'criteria'],
        },
      },
      {
        name: 'generate_diagram',
        description: 'Generate architecture diagram',
        inputSchema: {
          type: 'object',
          properties: {
            components: { type: 'array', items: { type: 'string' } },
            relationships: { type: 'array', items: { type: 'string' } },
            format: { type: 'string', enum: ['mermaid', 'ascii', 'plantuml'] },
          },
          required: ['components'],
        },
      },
    ];
  }

  protected calculateConfidence(task: any, output: string): number {
    let confidence = 0.6; // Lower base for architecture (more subjective)

    // Boost for comprehensive output
    if (output.includes('## Trade-offs')) confidence += 0.1;
    if (output.includes('## Architecture Decision Record') || output.includes('ADR')) confidence += 0.1;
    if (output.includes('```mermaid') || output.includes('```plantuml')) confidence += 0.05;
    if (output.includes('## Non-Functional')) confidence += 0.05;

    return Math.min(0.9, confidence); // Cap at 0.9 - architecture always needs review
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions: string[] = [];

    suggestions.push('Review architecture with team stakeholders');
    suggestions.push('Create proof-of-concept for critical components');
    suggestions.push('Validate scalability assumptions with load testing');
    suggestions.push('Document architecture decisions in ADR format');
    suggestions.push('Create implementation plan with milestones');

    return suggestions;
  }
}

export default ArchitectAgent;
