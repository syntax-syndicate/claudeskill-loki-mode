/**
 * Autonomi Extension - Agent Orchestrator
 *
 * Manages agent lifecycle, task queue, and concurrent execution.
 * Implements max 4 concurrent agent instances with priority-based queueing.
 *
 * Version: 1.0.0
 */

import {
  Task,
  TaskResult,
  TaskStatus,
  AgentType,
  AgentResult,
  Provider,
  OrchestratorStatus,
  AgentStatus,
  TaskQueueItem,
  TaskQueueStatus,
  RARVPhase,
  RARVEvent,
  EventHandler,
  ConfidenceTier,
} from '../types';

import { RARVCycle, MemoryStore } from './rarv-cycle';
import { AgentFactory, AgentCategory } from './agents/agent-factory';
import { BaseAgent } from './agents/base-agent';

// ============================================================================
// Orchestrator Configuration
// ============================================================================

interface OrchestratorConfig {
  maxConcurrent: number;
  queueSize: number;
  taskTimeout: number;
  retryFailedTasks: boolean;
  maxRetries: number;
  priorityBoostOnAge: boolean;
  priorityBoostThreshold: number; // ms
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrent: 4,
  queueSize: 100,
  taskTimeout: 300000, // 5 minutes
  retryFailedTasks: true,
  maxRetries: 3,
  priorityBoostOnAge: true,
  priorityBoostThreshold: 60000, // 1 minute
};

// ============================================================================
// Agent Orchestrator Class
// ============================================================================

export class AgentOrchestrator {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private agentFactory: AgentFactory;
  private provider: Provider;
  private config: OrchestratorConfig;

  // Execution state
  private activeAgents: Map<string, ActiveAgentInfo> = new Map();
  private taskQueue: TaskQueueItem[] = [];
  private completedTasks: TaskResult[] = [];
  private failedTasks: TaskResult[] = [];

  // Runtime state
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private totalCost: number = 0;

  // Event handling
  private eventHandlers: Set<EventHandler> = new Set();

  // Memory system
  private memoryStore: MemoryStore | null = null;

  // RARV cycle instances
  private rarvCycles: Map<string, RARVCycle> = new Map();

  constructor(provider: Provider, config: Partial<OrchestratorConfig> = {}) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentFactory = new AgentFactory(provider);
    this.initializeAgents();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Start the orchestrator
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();

    this.emitEvent('orchestrator-started', {});
    this.processQueue();
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Wait for active tasks to complete
    const activePromises = Array.from(this.activeAgents.values()).map(a => a.promise);
    await Promise.allSettled(activePromises);

    this.emitEvent('orchestrator-stopped', {
      completedCount: this.completedTasks.length,
      failedCount: this.failedTasks.length,
    });
  }

  /**
   * Pause the orchestrator (no new tasks started)
   */
  pause(): void {
    this.isPaused = true;
    this.emitEvent('orchestrator-paused', {});
  }

  /**
   * Resume the orchestrator
   */
  resume(): void {
    this.isPaused = false;
    this.emitEvent('orchestrator-resumed', {});
    this.processQueue();
  }

  /**
   * Dispatch a task for execution
   */
  async dispatch(task: Task): Promise<string> {
    // Validate queue capacity
    if (this.taskQueue.length >= this.config.queueSize) {
      throw new Error('Task queue is full');
    }

    // Calculate priority
    const priority = this.calculatePriority(task);

    // Add to queue
    const queueItem: TaskQueueItem = {
      task,
      priority,
      addedAt: new Date(),
      attempts: 0,
    };

    this.taskQueue.push(queueItem);
    this.sortQueue();

    this.emitEvent('task-queued', { taskId: task.id, priority });

    // Start processing if running
    if (this.isRunning && !this.isPaused) {
      this.processQueue();
    }

    return task.id;
  }

  /**
   * Dispatch multiple tasks
   */
  async dispatchBatch(tasks: Task[]): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      const id = await this.dispatch(task);
      taskIds.push(id);
    }

    return taskIds;
  }

  /**
   * Cancel a pending task
   */
  cancelTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex(item => item.task.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      this.emitEvent('task-cancelled', { taskId });
      return true;
    }
    return false;
  }

  /**
   * Select the appropriate agent type for a task
   */
  selectAgent(task: Task): AgentType {
    // Direct mapping for typed tasks
    if (task.type !== 'general') {
      return task.type as AgentType;
    }

    // Infer from task description
    return this.inferAgentType(task.description);
  }

  /**
   * Get orchestrator status
   */
  getStatus(): OrchestratorStatus {
    return {
      isRunning: this.isRunning,
      activeAgents: this.getActiveAgentStatuses(),
      queueStatus: this.getQueueStatus(),
      currentPhase: this.getCurrentPhase(),
      totalCost: this.totalCost,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): TaskQueueStatus {
    return {
      pending: this.taskQueue.length,
      inProgress: this.activeAgents.size,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      totalCost: this.totalCost,
    };
  }

  /**
   * Get task result by ID
   */
  getTaskResult(taskId: string): TaskResult | undefined {
    return [...this.completedTasks, ...this.failedTasks].find(r => r.taskId === taskId);
  }

  /**
   * Subscribe to orchestrator events
   */
  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Set memory store for learning persistence
   */
  setMemoryStore(store: MemoryStore): void {
    this.memoryStore = store;
  }

  /**
   * Get agent by type
   */
  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Map<AgentType, BaseAgent> {
    return new Map(this.agents);
  }

  // ==========================================================================
  // Private Methods - Queue Processing
  // ==========================================================================

  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    // Apply priority boost to aged tasks
    if (this.config.priorityBoostOnAge) {
      this.boostAgedTasks();
    }

    // Process tasks up to max concurrent
    while (
      this.activeAgents.size < this.config.maxConcurrent &&
      this.taskQueue.length > 0
    ) {
      const queueItem = this.taskQueue.shift();
      if (!queueItem) break;

      this.executeTask(queueItem);
    }
  }

  private async executeTask(queueItem: TaskQueueItem): Promise<void> {
    const { task } = queueItem;
    const agentType = this.selectAgent(task);
    const executionId = `exec_${task.id}_${Date.now()}`;

    // Create RARV cycle for this execution
    const rarvCycle = new RARVCycle(this.provider);
    if (this.memoryStore) {
      rarvCycle.setMemoryStore(this.memoryStore);
    }
    this.rarvCycles.set(executionId, rarvCycle);

    // Subscribe to RARV events
    rarvCycle.onEvent((event) => {
      this.handleRARVEvent(executionId, event);
    });

    // Track active agent
    const activeInfo: ActiveAgentInfo = {
      executionId,
      agentType,
      taskId: task.id,
      startedAt: new Date(),
      phase: 'reason',
      promise: null as any,
    };

    // Create execution promise
    const executionPromise = this.runExecution(rarvCycle, task, queueItem, executionId);
    activeInfo.promise = executionPromise;

    this.activeAgents.set(executionId, activeInfo);

    this.emitEvent('agent-started', {
      executionId,
      agentType,
      taskId: task.id,
    });

    // Execute and handle result
    executionPromise
      .then((result) => {
        this.handleTaskCompletion(executionId, result);
      })
      .catch((error) => {
        this.handleTaskError(executionId, queueItem, error);
      })
      .finally(() => {
        this.activeAgents.delete(executionId);
        this.rarvCycles.delete(executionId);
        this.processQueue(); // Process next task
      });
  }

  private async runExecution(
    rarvCycle: RARVCycle,
    task: Task,
    queueItem: TaskQueueItem,
    executionId: string
  ): Promise<TaskResult> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timeout after ${this.config.taskTimeout}ms`));
      }, this.config.taskTimeout);
    });

    // Race execution against timeout
    return Promise.race([
      rarvCycle.execute(task),
      timeoutPromise,
    ]);
  }

  private handleTaskCompletion(executionId: string, result: TaskResult): void {
    if (result.success) {
      this.completedTasks.push(result);
      this.totalCost += result.metrics.cost;

      this.emitEvent('task-completed', {
        executionId,
        taskId: result.taskId,
        cost: result.metrics.cost,
      });
    } else {
      this.failedTasks.push(result);

      this.emitEvent('task-failed', {
        executionId,
        taskId: result.taskId,
        errors: result.errors,
      });
    }
  }

  private handleTaskError(
    executionId: string,
    queueItem: TaskQueueItem,
    error: Error
  ): void {
    queueItem.attempts++;
    queueItem.lastAttemptAt = new Date();
    queueItem.error = error.message;

    // Retry if configured and under limit
    if (
      this.config.retryFailedTasks &&
      queueItem.attempts < this.config.maxRetries
    ) {
      this.taskQueue.push(queueItem);
      this.sortQueue();

      this.emitEvent('task-retry', {
        executionId,
        taskId: queueItem.task.id,
        attempt: queueItem.attempts,
        error: error.message,
      });
    } else {
      // Create failure result
      const failureResult: TaskResult = {
        taskId: queueItem.task.id,
        success: false,
        output: '',
        artifacts: [],
        learnings: [],
        metrics: {
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          duration: Date.now() - queueItem.addedAt.getTime(),
          phaseTimings: { idle: 0, reason: 0, act: 0, reflect: 0, verify: 0 },
        },
        errors: [{
          code: 'EXECUTION_ERROR',
          message: error.message,
          phase: 'act',
          recoverable: false,
        }],
        retryCount: queueItem.attempts,
      };

      this.failedTasks.push(failureResult);

      this.emitEvent('task-failed', {
        executionId,
        taskId: queueItem.task.id,
        error: error.message,
        attempts: queueItem.attempts,
      });
    }
  }

  private handleRARVEvent(executionId: string, event: RARVEvent): void {
    const activeInfo = this.activeAgents.get(executionId);
    if (activeInfo && event.type === 'phase-started') {
      activeInfo.phase = event.phase;
    }

    // Forward event with execution context
    this.emitEvent(event.type, {
      ...event.data,
      executionId,
    });
  }

  // ==========================================================================
  // Private Methods - Priority and Scheduling
  // ==========================================================================

  private calculatePriority(task: Task): number {
    let priority = 0;

    // Base priority from task priority
    const priorityMap: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    priority += priorityMap[task.priority] || 50;

    // Boost for high confidence tasks (faster execution)
    if (task.confidence >= 0.9) {
      priority += 20;
    } else if (task.confidence >= 0.6) {
      priority += 10;
    }

    // Reduce priority for complex tasks (give quick wins first)
    if (task.context.files.length > 5) {
      priority -= 10;
    }

    return priority;
  }

  private sortQueue(): void {
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  private boostAgedTasks(): void {
    const now = Date.now();

    for (const item of this.taskQueue) {
      const age = now - item.addedAt.getTime();
      if (age > this.config.priorityBoostThreshold) {
        // Boost by 5 points per threshold interval
        const boostMultiplier = Math.floor(age / this.config.priorityBoostThreshold);
        item.priority += boostMultiplier * 5;
      }
    }

    this.sortQueue();
  }

  // ==========================================================================
  // Private Methods - Agent Selection
  // ==========================================================================

  private inferAgentType(description: string): AgentType {
    const lower = description.toLowerCase();

    // Engineering patterns
    if (lower.match(/react|vue|angular|css|html|component|ui|frontend|style/)) {
      return 'frontend';
    }
    if (lower.match(/api|rest|graphql|endpoint|route|controller/)) {
      return 'api';
    }
    if (lower.match(/database|sql|schema|migration|query|table/)) {
      return 'database';
    }
    if (lower.match(/docker|kubernetes|k8s|ci|cd|deploy|pipeline|infra/)) {
      return 'devops';
    }
    if (lower.match(/test|spec|e2e|integration/)) {
      return 'qa';
    }
    if (lower.match(/node|python|go|java|server|backend|service/)) {
      return 'backend';
    }

    // Quality patterns
    if (lower.match(/review|code quality|lint/)) {
      return 'code-review';
    }
    if (lower.match(/security|vulnerability|owasp|secret/)) {
      return 'security-review';
    }
    if (lower.match(/performance|optimize|latency/)) {
      return 'perf';
    }
    if (lower.match(/generate test|unit test|test coverage/)) {
      return 'test-gen';
    }

    // Support patterns
    if (lower.match(/document|readme|api doc/)) {
      return 'docs';
    }
    if (lower.match(/refactor|clean|modernize/)) {
      return 'refactor';
    }
    if (lower.match(/migrate|upgrade|version/)) {
      return 'migration';
    }

    // Planning patterns
    if (lower.match(/architect|design|system/)) {
      return 'architect';
    }
    if (lower.match(/break down|decompose|split/)) {
      return 'decomposition';
    }

    // Default to backend
    return 'backend';
  }

  // ==========================================================================
  // Private Methods - State Management
  // ==========================================================================

  private initializeAgents(): void {
    this.agents = this.agentFactory.createAllAgents();
  }

  private getActiveAgentStatuses(): AgentStatus[] {
    return Array.from(this.activeAgents.values()).map(info => ({
      id: info.executionId,
      type: info.agentType,
      taskId: info.taskId,
      phase: info.phase,
      startedAt: info.startedAt,
      progress: this.estimateProgress(info),
    }));
  }

  private estimateProgress(info: ActiveAgentInfo): number {
    // Estimate progress based on phase
    const phaseProgress: Record<RARVPhase, number> = {
      idle: 0,
      reason: 0.15,
      act: 0.5,
      reflect: 0.8,
      verify: 0.95,
    };
    return phaseProgress[info.phase] || 0;
  }

  private getCurrentPhase(): RARVPhase {
    if (this.activeAgents.size === 0) {
      return 'idle';
    }

    // Return the most common phase among active agents
    const phases = Array.from(this.activeAgents.values()).map(a => a.phase);
    const phaseCounts = phases.reduce((acc, phase) => {
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<RARVPhase, number>);

    return Object.entries(phaseCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as RARVPhase;
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    const event: RARVEvent = {
      type: type as any,
      taskId: (data.taskId as string) || 'orchestrator',
      phase: (data.phase as RARVPhase) || 'idle',
      timestamp: new Date(),
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }
}

// ============================================================================
// Types
// ============================================================================

interface ActiveAgentInfo {
  executionId: string;
  agentType: AgentType;
  taskId: string;
  startedAt: Date;
  phase: RARVPhase;
  promise: Promise<TaskResult>;
}

// ============================================================================
// Exports
// ============================================================================

export { OrchestratorConfig };
export default AgentOrchestrator;
