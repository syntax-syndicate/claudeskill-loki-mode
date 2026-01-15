/**
 * Autonomi Extension - Main Entry Point
 *
 * Version: 1.0.0
 *
 * This module exports the core components of the Autonomi Extension:
 * - RARV Cycle: The Reason-Act-Reflect-Verify execution loop
 * - Agent System: 15 specialized agents for different task types
 * - Orchestrator: Manages agent lifecycle and concurrent execution
 * - Types: All TypeScript interfaces and types
 */

// Core Components
export {
  RARVCycle,
  RARVConfig,
  MemoryStore,
  AgentOrchestrator,
  OrchestratorConfig,
} from './core';

// Agents
export {
  BaseAgent,
  AgentFactory,
  AgentCategory,
  AgentDescription,
  AgentContext,
  AgentExecutionOptions,
  // Engineering
  FrontendAgent,
  BackendAgent,
  DatabaseAgent,
  ApiAgent,
  DevOpsAgent,
  QAAgent,
  // Quality
  CodeReviewAgent,
  SecurityReviewAgent,
  TestGenAgent,
  PerfAgent,
  // Support
  DocsAgent,
  RefactorAgent,
  MigrationAgent,
  // Planning
  ArchitectAgent,
  DecompositionAgent,
} from './core/agents';

// Types
export * from './types';

/**
 * Quick Start Example:
 *
 * ```typescript
 * import {
 *   AgentOrchestrator,
 *   RARVCycle,
 *   AgentFactory,
 *   Task,
 *   Provider
 * } from '@autonomi/extension';
 *
 * // Create provider (implement Provider interface)
 * const provider: Provider = new MyProvider();
 *
 * // Create orchestrator
 * const orchestrator = new AgentOrchestrator(provider, {
 *   maxConcurrent: 4,
 * });
 *
 * // Start orchestrator
 * orchestrator.start();
 *
 * // Dispatch a task
 * const task: Task = {
 *   id: 'task-1',
 *   description: 'Add a new React component',
 *   type: 'frontend',
 *   priority: 'medium',
 *   status: 'pending',
 *   confidence: 0.8,
 *   estimatedCost: 0.05,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   context: {
 *     files: ['src/components/'],
 *     workspaceRoot: '/path/to/project',
 *     language: 'typescript',
 *     framework: 'react',
 *   },
 *   metadata: {},
 * };
 *
 * await orchestrator.dispatch(task);
 *
 * // Get status
 * const status = orchestrator.getStatus();
 * console.log(status);
 * ```
 */
