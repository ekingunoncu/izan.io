import { create } from 'zustand'
import { db } from '~/lib/db'
import type { ScheduledPlan, PlanExecution, PlanScheduleType } from '~/lib/db'
import { validateCron, getNextCronRun } from '~/lib/scheduler/cron'
import { useChatStore } from './chat.store'
import { useAgentStore } from './agent.store'

interface PlanStoreState {
  plans: ScheduledPlan[]
  executions: PlanExecution[]
  isInitialized: boolean

  initialize: () => Promise<void>
  createPlan: (data: {
    name: string
    description: string
    agentId: string
    prompt: string
    scheduleType: PlanScheduleType
    cronExpression: string | null
    scheduledAt: number | null
    providerId?: string | null
    modelId?: string | null
  }) => Promise<ScheduledPlan>
  updatePlan: (planId: string, updates: Partial<Pick<ScheduledPlan, 'name' | 'description' | 'agentId' | 'prompt' | 'scheduleType' | 'cronExpression' | 'scheduledAt' | 'status' | 'providerId' | 'modelId'>>) => Promise<void>
  deletePlan: (planId: string) => Promise<void>
  togglePlanStatus: (planId: string) => Promise<void>
  executePlan: (planId: string) => Promise<void>
  checkAndExecuteDuePlans: () => Promise<void>
  getExecutionsForPlan: (planId: string) => PlanExecution[]
}

/** Guard against concurrent execution of the same plan */
const executingPlanIds = new Set<string>()

/** Compute nextRunAt for a plan */
function computeNextRunAt(plan: Pick<ScheduledPlan, 'scheduleType' | 'cronExpression' | 'scheduledAt' | 'status'>): number | null {
  if (plan.status !== 'active') return null
  if (plan.scheduleType === 'once') {
    return plan.scheduledAt
  }
  if (plan.scheduleType === 'recurring' && plan.cronExpression) {
    try {
      return getNextCronRun(plan.cronExpression)
    } catch {
      return null
    }
  }
  return null
}

export const usePlanStore = create<PlanStoreState>((set, get) => ({
  plans: [],
  executions: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return
    try {
      const [plans, executions] = await Promise.all([
        db.scheduledPlans.toArray(),
        db.planExecutions.orderBy('startedAt').reverse().limit(200).toArray(),
      ])

      // Recovery: mark any 'running' executions as 'failed' (page was reloaded)
      for (const exec of executions) {
        if (exec.status === 'running') {
          exec.status = 'failed'
          exec.error = 'Execution interrupted (page reloaded)'
          exec.completedAt = Date.now()
          db.planExecutions.update(exec.id, {
            status: 'failed',
            error: exec.error,
            completedAt: exec.completedAt,
          }).catch(() => {})
        }
      }

      set({ plans, executions, isInitialized: true })
    } catch (error) {
      console.error('[plan-store] Failed to initialize:', error)
      set({ isInitialized: true })
    }
  },

  createPlan: async (data) => {
    // Validate cron if recurring
    if (data.scheduleType === 'recurring' && data.cronExpression) {
      const error = validateCron(data.cronExpression)
      if (error) throw new Error(`Invalid cron expression: ${error}`)
    }

    const now = Date.now()
    const plan: ScheduledPlan = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      agentId: data.agentId,
      prompt: data.prompt,
      scheduleType: data.scheduleType,
      cronExpression: data.cronExpression,
      scheduledAt: data.scheduledAt,
      providerId: data.providerId ?? null,
      modelId: data.modelId ?? null,
      status: 'active',
      lastRunAt: null,
      nextRunAt: null,
      runCount: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }
    plan.nextRunAt = computeNextRunAt(plan)

    await db.scheduledPlans.add(plan)
    set(state => ({ plans: [...state.plans, plan] }))
    return plan
  },

  updatePlan: async (planId, updates) => {
    const plan = get().plans.find(p => p.id === planId)
    if (!plan) return

    // Validate cron if updating to recurring
    const newType = updates.scheduleType ?? plan.scheduleType
    const newCron = updates.cronExpression !== undefined ? updates.cronExpression : plan.cronExpression
    if (newType === 'recurring' && newCron) {
      const error = validateCron(newCron)
      if (error) throw new Error(`Invalid cron expression: ${error}`)
    }

    // Auto-reactivate: if the schedule changed on a completed/error plan, reset to active
    // so the toggle and next-run logic work correctly (e.g. once→recurring edit)
    const scheduleChanged = (updates.scheduleType && updates.scheduleType !== plan.scheduleType)
      || (updates.cronExpression !== undefined && updates.cronExpression !== plan.cronExpression)
      || (updates.scheduledAt !== undefined && updates.scheduledAt !== plan.scheduledAt)
    if (scheduleChanged && (plan.status === 'completed' || plan.status === 'error') && !updates.status) {
      updates = { ...updates, status: 'active' }
    }

    const merged = { ...plan, ...updates, updatedAt: Date.now() }
    merged.nextRunAt = computeNextRunAt(merged)

    await db.scheduledPlans.update(planId, {
      ...updates,
      nextRunAt: merged.nextRunAt,
      updatedAt: merged.updatedAt,
    })
    set(state => ({
      plans: state.plans.map(p => p.id === planId ? merged : p),
    }))
  },

  deletePlan: async (planId) => {
    await db.transaction('rw', [db.scheduledPlans, db.planExecutions], async () => {
      await db.scheduledPlans.delete(planId)
      await db.planExecutions.where('planId').equals(planId).delete()
    })
    set(state => ({
      plans: state.plans.filter(p => p.id !== planId),
      executions: state.executions.filter(e => e.planId !== planId),
    }))
  },

  togglePlanStatus: async (planId) => {
    const plan = get().plans.find(p => p.id === planId)
    if (!plan) return

    const newStatus = plan.status === 'active' ? 'paused' : 'active'
    await get().updatePlan(planId, { status: newStatus })
  },

  executePlan: async (planId) => {
    // Concurrent execution guard
    if (executingPlanIds.has(planId)) return
    executingPlanIds.add(planId)

    const plan = get().plans.find(p => p.id === planId)
    if (!plan) {
      executingPlanIds.delete(planId)
      return
    }

    // Multi-tab guard: check if recently executed (within 10s)
    const freshPlan = await db.scheduledPlans.get(planId)
    if (freshPlan?.lastRunAt && Date.now() - freshPlan.lastRunAt < 10_000) {
      executingPlanIds.delete(planId)
      return
    }

    // Check agent exists
    const agentStore = useAgentStore.getState()
    const agent = agentStore.getAgentById(plan.agentId)
    if (!agent) {
      await get().updatePlan(planId, { status: 'error' })
      await db.scheduledPlans.update(planId, { lastError: 'Agent not found' })
      set(state => ({
        plans: state.plans.map(p => p.id === planId ? { ...p, lastError: 'Agent not found' } : p),
      }))
      executingPlanIds.delete(planId)
      return
    }

    // Create execution record
    const execution: PlanExecution = {
      id: crypto.randomUUID(),
      planId,
      chatId: '',
      agentId: plan.agentId,
      status: 'running',
      error: null,
      startedAt: Date.now(),
      completedAt: null,
    }
    await db.planExecutions.add(execution)
    set(state => ({ executions: [execution, ...state.executions] }))

    try {
      // Run the plan via chat store's executePlanMessage
      const result = await useChatStore.getState().executePlanMessage(
        plan.agentId,
        plan.prompt,
        plan.name,
        plan.id,
        plan.providerId ?? undefined,
        plan.modelId ?? undefined,
      )

      const now = Date.now()
      execution.chatId = result.chatId
      execution.completedAt = now

      if (result.success) {
        execution.status = 'completed'

        // Update plan state
        const newRunCount = plan.runCount + 1
        const planUpdates: Partial<ScheduledPlan> = {
          lastRunAt: now,
          runCount: newRunCount,
          lastError: null,
          updatedAt: now,
        }

        // For one-time plans, mark as completed
        if (plan.scheduleType === 'once') {
          planUpdates.status = 'completed'
          planUpdates.nextRunAt = null
        } else {
          // Compute next run
          planUpdates.nextRunAt = computeNextRunAt({ ...plan, ...planUpdates, status: plan.status })
        }

        await db.scheduledPlans.update(planId, planUpdates)
        set(state => ({
          plans: state.plans.map(p => p.id === planId ? { ...p, ...planUpdates } : p),
          executions: state.executions.map(e => e.id === execution.id ? execution : e),
        }))
      } else {
        execution.status = 'failed'
        execution.error = result.error || 'Unknown error'

        await db.scheduledPlans.update(planId, {
          lastRunAt: now,
          lastError: execution.error,
          updatedAt: now,
        })
        set(state => ({
          plans: state.plans.map(p => p.id === planId
            ? { ...p, lastRunAt: now, lastError: execution.error, updatedAt: now }
            : p),
          executions: state.executions.map(e => e.id === execution.id ? execution : e),
        }))
      }

      await db.planExecutions.update(execution.id, {
        chatId: execution.chatId,
        status: execution.status,
        error: execution.error,
        completedAt: execution.completedAt,
      })
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.completedAt = Date.now()

      await db.planExecutions.update(execution.id, {
        status: 'failed',
        error: execution.error,
        completedAt: execution.completedAt,
      }).catch(() => {})

      await db.scheduledPlans.update(planId, {
        lastRunAt: Date.now(),
        lastError: execution.error,
        updatedAt: Date.now(),
      }).catch(() => {})

      set(state => ({
        plans: state.plans.map(p => p.id === planId
          ? { ...p, lastRunAt: Date.now(), lastError: execution.error, updatedAt: Date.now() }
          : p),
        executions: state.executions.map(e => e.id === execution.id ? execution : e),
      }))
    } finally {
      executingPlanIds.delete(planId)
    }
  },

  checkAndExecuteDuePlans: async () => {
    const now = Date.now()
    const plans = get().plans.filter(
      p => p.status === 'active' && p.nextRunAt != null && p.nextRunAt <= now
    )

    for (const plan of plans) {
      await get().executePlan(plan.id)
    }
  },

  getExecutionsForPlan: (planId) => {
    return get().executions.filter(e => e.planId === planId)
  },
}))
