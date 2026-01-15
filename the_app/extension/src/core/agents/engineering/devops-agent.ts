/**
 * Autonomi Extension - DevOps Agent
 *
 * Specialized agent for DevOps tasks including
 * CI/CD, Docker, Kubernetes, and infrastructure as code.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class DevOpsAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('devops', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert DevOps agent specializing in infrastructure and deployment.

CORE EXPERTISE:
- Docker (multi-stage builds, compose, swarm)
- Kubernetes (deployments, services, ingress, operators)
- CI/CD (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Infrastructure as Code (Terraform, Pulumi, CDK)
- Cloud platforms (AWS, GCP, Azure)
- Monitoring (Prometheus, Grafana, Datadog)
- Logging (ELK, Loki, CloudWatch)
- Secret management (Vault, AWS Secrets Manager)
- Helm charts
- GitOps (ArgoCD, Flux)

BEST PRACTICES:
1. Use multi-stage Docker builds
2. Follow 12-factor app principles
3. Implement proper health checks
4. Use resource limits and requests
5. Implement proper secret management
6. Use infrastructure as code
7. Implement proper logging
8. Set up monitoring and alerting
9. Use immutable infrastructure
10. Implement proper backup strategies

OUTPUT FORMAT:
- Provide complete configuration files
- Include comments explaining key decisions
- Add health check configurations
- Include resource specifications
- Show example commands
- Use appropriate file format code blocks

SECURITY CONSIDERATIONS:
- Never include secrets in configs
- Use least privilege for service accounts
- Enable network policies
- Use pod security policies/standards
- Scan images for vulnerabilities
- Use private registries`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'generate_dockerfile',
        description: 'Generate optimized Dockerfile',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', enum: ['node', 'python', 'go', 'java', 'rust'] },
            framework: { type: 'string' },
            requirements: { type: 'string' },
          },
          required: ['language'],
        },
      },
      {
        name: 'generate_k8s_manifest',
        description: 'Generate Kubernetes manifest',
        inputSchema: {
          type: 'object',
          properties: {
            resourceType: { type: 'string', enum: ['deployment', 'service', 'ingress', 'configmap', 'secret'] },
            appName: { type: 'string' },
            requirements: { type: 'string' },
          },
          required: ['resourceType', 'appName'],
        },
      },
      {
        name: 'generate_cicd_pipeline',
        description: 'Generate CI/CD pipeline configuration',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['github-actions', 'gitlab-ci', 'jenkins', 'circleci'] },
            stages: { type: 'array', items: { type: 'string' } },
          },
          required: ['platform'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // DevOps-specific warnings
    if (output.includes(':latest')) {
      warnings.push('Using :latest tag is not recommended for production');
    }
    if (output.includes('privileged: true')) {
      warnings.push('Privileged containers pose security risks');
    }
    if (output.includes('root') && output.includes('USER')) {
      warnings.push('Running as root user - consider non-root user');
    }
    if (!output.includes('limits') && output.includes('resources')) {
      warnings.push('Consider setting resource limits');
    }
    if (output.includes('password') || output.includes('secret')) {
      warnings.push('Ensure secrets are not hardcoded in configuration');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // DevOps-specific suggestions
    if (output.includes('Dockerfile')) {
      suggestions.push('Scan Docker image for vulnerabilities');
      suggestions.push('Consider using distroless or alpine base images');
    }
    if (output.includes('kind: Deployment')) {
      suggestions.push('Add HorizontalPodAutoscaler for auto-scaling');
      suggestions.push('Configure PodDisruptionBudget for high availability');
    }
    if (!output.includes('healthcheck') && !output.includes('livenessProbe')) {
      suggestions.push('Add health check configuration');
    }

    return suggestions;
  }
}

export default DevOpsAgent;
