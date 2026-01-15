/**
 * Autonomi Extension - Agent Factory
 *
 * Factory class for creating specialized agents based on AgentType.
 * Provides centralized agent instantiation and configuration.
 *
 * Version: 1.0.0
 */

import { AgentType, Provider, AgentConfig } from '../../types';
import { BaseAgent } from './base-agent';

// Engineering Agents
import { FrontendAgent } from './engineering/frontend-agent';
import { BackendAgent } from './engineering/backend-agent';
import { DatabaseAgent } from './engineering/database-agent';
import { ApiAgent } from './engineering/api-agent';
import { DevOpsAgent } from './engineering/devops-agent';
import { QAAgent } from './engineering/qa-agent';

// Quality Agents
import { CodeReviewAgent } from './quality/code-review-agent';
import { SecurityReviewAgent } from './quality/security-review-agent';
import { TestGenAgent } from './quality/test-gen-agent';
import { PerfAgent } from './quality/perf-agent';

// Support Agents
import { DocsAgent } from './support/docs-agent';
import { RefactorAgent } from './support/refactor-agent';
import { MigrationAgent } from './support/migration-agent';

// Planning Agents
import { ArchitectAgent } from './planning/architect-agent';
import { DecompositionAgent } from './planning/decomposition-agent';

// ============================================================================
// Agent Factory Class
// ============================================================================

export class AgentFactory {
  private provider: Provider;
  private agentCache: Map<AgentType, BaseAgent> = new Map();
  private defaultConfigs: Map<AgentType, Partial<AgentConfig>> = new Map();

  constructor(provider: Provider) {
    this.provider = provider;
    this.initializeDefaultConfigs();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Create an agent of the specified type
   * Uses cached instance if available, or creates new one
   */
  createAgent(type: AgentType, config?: Partial<AgentConfig>): BaseAgent {
    // Check cache first (if no custom config provided)
    if (!config && this.agentCache.has(type)) {
      return this.agentCache.get(type)!;
    }

    // Merge default config with custom config
    const mergedConfig = {
      ...this.defaultConfigs.get(type),
      ...config,
    };

    // Create new agent instance
    const agent = this.instantiateAgent(type, mergedConfig);

    // Cache if no custom config
    if (!config) {
      this.agentCache.set(type, agent);
    }

    return agent;
  }

  /**
   * Create all agents at once (for preloading)
   */
  createAllAgents(): Map<AgentType, BaseAgent> {
    const agents = new Map<AgentType, BaseAgent>();

    for (const type of this.getAllAgentTypes()) {
      agents.set(type, this.createAgent(type));
    }

    return agents;
  }

  /**
   * Get all available agent types
   */
  getAllAgentTypes(): AgentType[] {
    return [
      // Engineering
      'frontend',
      'backend',
      'database',
      'api',
      'devops',
      'qa',
      // Quality
      'code-review',
      'security-review',
      'test-gen',
      'perf',
      // Support
      'docs',
      'refactor',
      'migration',
      // Planning
      'architect',
      'decomposition',
    ];
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: AgentCategory): AgentType[] {
    const categories: Record<AgentCategory, AgentType[]> = {
      engineering: ['frontend', 'backend', 'database', 'api', 'devops', 'qa'],
      quality: ['code-review', 'security-review', 'test-gen', 'perf'],
      support: ['docs', 'refactor', 'migration'],
      planning: ['architect', 'decomposition'],
    };

    return categories[category] || [];
  }

  /**
   * Get agent description
   */
  getAgentDescription(type: AgentType): AgentDescription {
    return AGENT_DESCRIPTIONS[type];
  }

  /**
   * Set default configuration for an agent type
   */
  setDefaultConfig(type: AgentType, config: Partial<AgentConfig>): void {
    this.defaultConfigs.set(type, config);
    // Clear cache to use new config
    this.agentCache.delete(type);
  }

  /**
   * Clear agent cache
   */
  clearCache(): void {
    this.agentCache.clear();
  }

  /**
   * Update provider for all agents
   */
  updateProvider(provider: Provider): void {
    this.provider = provider;
    this.clearCache();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private instantiateAgent(type: AgentType, config?: Partial<AgentConfig>): BaseAgent {
    switch (type) {
      // Engineering Agents
      case 'frontend':
        return new FrontendAgent(this.provider, config);
      case 'backend':
        return new BackendAgent(this.provider, config);
      case 'database':
        return new DatabaseAgent(this.provider, config);
      case 'api':
        return new ApiAgent(this.provider, config);
      case 'devops':
        return new DevOpsAgent(this.provider, config);
      case 'qa':
        return new QAAgent(this.provider, config);

      // Quality Agents
      case 'code-review':
        return new CodeReviewAgent(this.provider, config);
      case 'security-review':
        return new SecurityReviewAgent(this.provider, config);
      case 'test-gen':
        return new TestGenAgent(this.provider, config);
      case 'perf':
        return new PerfAgent(this.provider, config);

      // Support Agents
      case 'docs':
        return new DocsAgent(this.provider, config);
      case 'refactor':
        return new RefactorAgent(this.provider, config);
      case 'migration':
        return new MigrationAgent(this.provider, config);

      // Planning Agents
      case 'architect':
        return new ArchitectAgent(this.provider, config);
      case 'decomposition':
        return new DecompositionAgent(this.provider, config);

      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  private initializeDefaultConfigs(): void {
    // Engineering agents - use Sonnet
    this.defaultConfigs.set('frontend', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('backend', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('database', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('api', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('devops', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('qa', { model: 'sonnet', maxTokens: 4000 });

    // Quality agents - use Sonnet for reasoning
    this.defaultConfigs.set('code-review', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('security-review', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('test-gen', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('perf', { model: 'sonnet', maxTokens: 4000 });

    // Support agents - use Sonnet
    this.defaultConfigs.set('docs', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('refactor', { model: 'sonnet', maxTokens: 4000 });
    this.defaultConfigs.set('migration', { model: 'sonnet', maxTokens: 4000 });

    // Planning agents - Opus for architecture, Sonnet for decomposition
    this.defaultConfigs.set('architect', { model: 'opus', maxTokens: 8000 });
    this.defaultConfigs.set('decomposition', { model: 'sonnet', maxTokens: 4000 });
  }
}

// ============================================================================
// Types
// ============================================================================

export type AgentCategory = 'engineering' | 'quality' | 'support' | 'planning';

export interface AgentDescription {
  type: AgentType;
  category: AgentCategory;
  name: string;
  description: string;
  specialties: string[];
  defaultModel: string;
}

// ============================================================================
// Agent Descriptions
// ============================================================================

const AGENT_DESCRIPTIONS: Record<AgentType, AgentDescription> = {
  // Engineering Agents
  frontend: {
    type: 'frontend',
    category: 'engineering',
    name: 'Frontend Agent',
    description: 'Specializes in frontend development with React, Vue, Angular, CSS, and HTML',
    specialties: ['React', 'Vue', 'Angular', 'CSS', 'HTML', 'TypeScript'],
    defaultModel: 'sonnet',
  },
  backend: {
    type: 'backend',
    category: 'engineering',
    name: 'Backend Agent',
    description: 'Specializes in backend development with Node.js, Python, Go, and Java',
    specialties: ['Node.js', 'Python', 'Go', 'Java', 'APIs', 'Microservices'],
    defaultModel: 'sonnet',
  },
  database: {
    type: 'database',
    category: 'engineering',
    name: 'Database Agent',
    description: 'Specializes in SQL, migrations, schema design, and query optimization',
    specialties: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Migrations'],
    defaultModel: 'sonnet',
  },
  api: {
    type: 'api',
    category: 'engineering',
    name: 'API Agent',
    description: 'Specializes in REST, GraphQL, and OpenAPI specification',
    specialties: ['REST', 'GraphQL', 'OpenAPI', 'gRPC', 'API Design'],
    defaultModel: 'sonnet',
  },
  devops: {
    type: 'devops',
    category: 'engineering',
    name: 'DevOps Agent',
    description: 'Specializes in CI/CD, Docker, Kubernetes, and infrastructure as code',
    specialties: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'AWS/GCP/Azure'],
    defaultModel: 'sonnet',
  },
  qa: {
    type: 'qa',
    category: 'engineering',
    name: 'QA Agent',
    description: 'Specializes in test strategy, E2E testing, and integration testing',
    specialties: ['Playwright', 'Cypress', 'Test Strategy', 'E2E', 'Integration'],
    defaultModel: 'sonnet',
  },

  // Quality Agents
  'code-review': {
    type: 'code-review',
    category: 'quality',
    name: 'Code Review Agent',
    description: 'Specializes in code quality analysis, patterns, and maintainability',
    specialties: ['Code Quality', 'Best Practices', 'SOLID', 'Clean Code'],
    defaultModel: 'sonnet',
  },
  'security-review': {
    type: 'security-review',
    category: 'quality',
    name: 'Security Review Agent',
    description: 'Specializes in vulnerability detection, secrets scanning, and OWASP compliance',
    specialties: ['OWASP', 'Vulnerabilities', 'Secrets', 'Security Audit'],
    defaultModel: 'sonnet',
  },
  'test-gen': {
    type: 'test-gen',
    category: 'quality',
    name: 'Test Generation Agent',
    description: 'Specializes in generating unit tests and achieving coverage targets',
    specialties: ['Unit Tests', 'Coverage', 'Jest', 'pytest', 'Mocking'],
    defaultModel: 'sonnet',
  },
  perf: {
    type: 'perf',
    category: 'quality',
    name: 'Performance Agent',
    description: 'Specializes in performance analysis, profiling, and optimization',
    specialties: ['Performance', 'Optimization', 'Profiling', 'Complexity'],
    defaultModel: 'sonnet',
  },

  // Support Agents
  docs: {
    type: 'docs',
    category: 'support',
    name: 'Documentation Agent',
    description: 'Specializes in README files, API documentation, and code comments',
    specialties: ['README', 'API Docs', 'JSDoc', 'Technical Writing'],
    defaultModel: 'sonnet',
  },
  refactor: {
    type: 'refactor',
    category: 'support',
    name: 'Refactor Agent',
    description: 'Specializes in code cleanup, modernization, and pattern improvements',
    specialties: ['Refactoring', 'Code Cleanup', 'Modernization', 'Patterns'],
    defaultModel: 'sonnet',
  },
  migration: {
    type: 'migration',
    category: 'support',
    name: 'Migration Agent',
    description: 'Specializes in language/framework upgrades and version migrations',
    specialties: ['Migrations', 'Upgrades', 'Version Updates', 'Codemods'],
    defaultModel: 'sonnet',
  },

  // Planning Agents
  architect: {
    type: 'architect',
    category: 'planning',
    name: 'Architect Agent',
    description: 'Specializes in system design and architecture decisions',
    specialties: ['System Design', 'Architecture', 'ADRs', 'Scalability'],
    defaultModel: 'opus',
  },
  decomposition: {
    type: 'decomposition',
    category: 'planning',
    name: 'Decomposition Agent',
    description: 'Specializes in breaking complex tasks into manageable subtasks',
    specialties: ['Task Breakdown', 'Dependencies', 'Planning', 'Prioritization'],
    defaultModel: 'sonnet',
  },
};

// ============================================================================
// Exports
// ============================================================================

export { AgentFactory as default };
