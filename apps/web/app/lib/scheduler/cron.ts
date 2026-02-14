import { CronExpressionParser } from 'cron-parser'

/**
 * Validate a cron expression.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateCron(expr: string): string | null {
  try {
    CronExpressionParser.parse(expr)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid cron expression'
  }
}

/**
 * Get the next run time for a cron expression.
 * @param expr - Standard 5-field cron expression
 * @param from - Optional start date (defaults to now)
 * @returns epoch ms of the next run
 */
export function getNextCronRun(expr: string, from?: Date): number {
  const interval = CronExpressionParser.parse(expr, {
    currentDate: from ?? new Date(),
  })
  return interval.next().toDate().getTime()
}

/**
 * Get a human-readable description of the next run time.
 * Returns relative time like "in 5 minutes" or an absolute date string.
 */
export function describeCronNextRun(expr: string): string {
  try {
    const nextMs = getNextCronRun(expr)
    const now = Date.now()
    const diffMs = nextMs - now
    const diffMin = Math.round(diffMs / 60_000)

    if (diffMin < 1) return 'less than a minute'
    if (diffMin < 60) return `in ${diffMin} minute${diffMin === 1 ? '' : 's'}`
    const diffHours = Math.round(diffMin / 60)
    if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
    return new Date(nextMs).toLocaleString()
  } catch {
    return 'unknown'
  }
}
