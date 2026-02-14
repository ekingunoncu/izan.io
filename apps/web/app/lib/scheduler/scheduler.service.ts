import { usePlanStore } from '~/store/plan.store'

const CHECK_INTERVAL_MS = 30_000 // 30 seconds

/**
 * Scheduler service - singleton that checks for due plans periodically.
 * Uses setInterval as primary mechanism, with extension alarms as backup.
 */
class SchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private started = false

  /**
   * Start the scheduler. Catches up missed plans and begins periodic checks.
   */
  async start(): Promise<void> {
    if (this.started) return
    this.started = true

    // Catch up any missed plans on startup
    try {
      await usePlanStore.getState().checkAndExecuteDuePlans()
    } catch (err) {
      console.warn('[scheduler] Error catching up missed plans:', err)
    }

    // Start periodic check
    this.intervalId = setInterval(() => {
      usePlanStore.getState().checkAndExecuteDuePlans().catch((err) => {
        console.warn('[scheduler] Error checking due plans:', err)
      })
    }, CHECK_INTERVAL_MS)

    // Register extension alarms for all active plans
    this.syncAllAlarms()

    // Listen for extension alarm messages
    window.addEventListener('message', this.handleExtensionMessage)

    // Check for due plans when tab becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    console.log('[scheduler] Started')
  }

  /**
   * Stop the scheduler and clean up.
   */
  stop(): void {
    if (!this.started) return
    this.started = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    window.removeEventListener('message', this.handleExtensionMessage)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    console.log('[scheduler] Stopped')
  }

  /**
   * Register a chrome.alarms alarm via the extension for a specific plan.
   */
  registerAlarm(planId: string, fireAt: number): void {
    window.postMessage({
      source: 'izan-page',
      channel: 'plan-alarm-register',
      planId,
      fireAt,
    }, '*')
  }

  /**
   * Clear a plan alarm in the extension.
   */
  clearAlarm(planId: string): void {
    window.postMessage({
      source: 'izan-page',
      channel: 'plan-alarm-clear',
      planId,
    }, '*')
  }

  /**
   * Sync all active plan alarms to the extension.
   */
  syncAllAlarms(): void {
    const plans = usePlanStore.getState().plans
    const activeAlarms = plans
      .filter(p => p.status === 'active' && p.nextRunAt)
      .map(p => ({ planId: p.id, fireAt: p.nextRunAt! }))

    window.postMessage({
      source: 'izan-page',
      channel: 'plan-alarm-sync',
      alarms: activeAlarms,
    }, '*')
  }

  private handleExtensionMessage = (evt: MessageEvent) => {
    const msg = evt.data
    if (msg?.source !== 'izan-extension' || msg?.channel !== 'plan-alarm-fired') return
    const planId = msg.planId as string | undefined
    if (!planId) return

    console.log('[scheduler] Extension alarm fired for plan:', planId)
    usePlanStore.getState().executePlan(planId).catch((err) => {
      console.warn('[scheduler] Error executing plan from alarm:', err)
    })
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      usePlanStore.getState().checkAndExecuteDuePlans().catch((err) => {
        console.warn('[scheduler] Error checking plans on visibility change:', err)
      })
    }
  }
}

export const schedulerService = new SchedulerService()
