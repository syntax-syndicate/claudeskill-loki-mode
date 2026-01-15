/**
 * Autonomi Extension - Security Review Agent
 *
 * Specialized agent for security analysis including
 * vulnerabilities, secrets detection, and OWASP compliance.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool, ModelTier } from '../../../types';

export class SecurityReviewAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('security-review', provider, config);
  }

  protected getDefaultModel(): ModelTier {
    return 'sonnet'; // Security analysis needs good reasoning
  }

  getSystemPrompt(): string {
    return `You are an expert security review agent focused on identifying vulnerabilities.

SECURITY FOCUS AREAS:

1. OWASP Top 10 (2021)
   - A01: Broken Access Control
   - A02: Cryptographic Failures
   - A03: Injection
   - A04: Insecure Design
   - A05: Security Misconfiguration
   - A06: Vulnerable Components
   - A07: Authentication Failures
   - A08: Data Integrity Failures
   - A09: Logging Failures
   - A10: SSRF

2. Secret Detection
   - API keys
   - Passwords
   - Tokens
   - Private keys
   - Connection strings

3. Input Validation
   - SQL injection
   - XSS vulnerabilities
   - Command injection
   - Path traversal
   - SSRF

4. Authentication & Authorization
   - Broken auth flows
   - Missing auth checks
   - Privilege escalation
   - Session management

5. Cryptography
   - Weak algorithms
   - Improper key management
   - Missing encryption
   - Insecure random

SECURITY REVIEW OUTPUT FORMAT:
## Security Summary
Overall security posture assessment

## Critical Vulnerabilities
Must fix immediately
- [CRITICAL] CVE/CWE reference if applicable - Description
  - Location: file:line
  - Impact: Description of potential impact
  - Remediation: How to fix

## High Risk Issues
Should fix before deployment
- [HIGH] Description
  - Location: file:line
  - Impact: Description
  - Remediation: Fix suggestion

## Medium/Low Risk Issues
Should be addressed
- [MEDIUM/LOW] Description

## Secrets Detected
- [SECRET] Type of secret - Location

## Compliance Notes
Relevant compliance considerations

## Security Verdict
SECURE / NEEDS_REMEDIATION / CRITICAL_BLOCK

Always provide specific remediation guidance.`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'scan_secrets',
        description: 'Scan code for hardcoded secrets',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to scan' },
            patterns: { type: 'array', items: { type: 'string' } },
          },
          required: ['code'],
        },
      },
      {
        name: 'check_dependencies',
        description: 'Check dependencies for known vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            dependencies: { type: 'string', description: 'Package.json, requirements.txt, etc.' },
          },
          required: ['dependencies'],
        },
      },
      {
        name: 'analyze_auth_flow',
        description: 'Analyze authentication/authorization implementation',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            authType: { type: 'string', enum: ['jwt', 'session', 'oauth', 'api-key'] },
          },
          required: ['code'],
        },
      },
    ];
  }

  protected identifyWarnings(task: any, output: string): string[] {
    const warnings = super.identifyWarnings(task, output);

    // Security-specific critical warnings
    if (output.includes('[CRITICAL]')) {
      warnings.push('CRITICAL SECURITY ISSUES FOUND - Immediate attention required');
    }
    if (output.includes('[SECRET]')) {
      warnings.push('SECRETS DETECTED - Remove before committing to repository');
    }
    if (output.includes('CRITICAL_BLOCK')) {
      warnings.push('SECURITY REVIEW BLOCKED - Cannot proceed until issues are resolved');
    }

    return warnings;
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions: string[] = [];

    if (output.includes('[CRITICAL]')) {
      suggestions.push('Immediately address all critical vulnerabilities');
      suggestions.push('Do not deploy until critical issues are resolved');
    }
    if (output.includes('[SECRET]')) {
      suggestions.push('Remove all hardcoded secrets');
      suggestions.push('Rotate any exposed credentials');
      suggestions.push('Use secret management solution');
    }
    if (output.includes('injection')) {
      suggestions.push('Implement input validation and sanitization');
      suggestions.push('Use parameterized queries');
    }
    if (output.includes('XSS')) {
      suggestions.push('Implement proper output encoding');
      suggestions.push('Use Content Security Policy headers');
    }

    return suggestions;
  }
}

export default SecurityReviewAgent;
