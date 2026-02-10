/**
 * Random Number Generator - Tool handlers
 *
 * Provides a single tool that generates one or more random numbers
 * within a configurable range.
 */

import { z } from 'zod'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const generateRandomNumberSchema = z.object({
  min: z
    .number()
    .optional()
    .default(0)
    .describe('Minimum value (inclusive). Defaults to 0.'),
  max: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum value (inclusive). Defaults to 100.'),
  count: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(1)
    .describe('How many random numbers to generate (1-100). Defaults to 1.'),
})

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleGenerateRandomNumber(
  args: Record<string, unknown>,
): Promise<string> {
  const { min, max, count } = generateRandomNumberSchema.parse(args)

  if (min > max) {
    throw new Error(`min (${min}) must be less than or equal to max (${max})`)
  }

  const numbers: number[] = []
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * (max - min + 1)) + min)
  }

  if (count === 1) {
    return String(numbers[0])
  }

  return JSON.stringify(numbers)
}

// ─── Tool definitions (for reference / testing) ──────────────────────────────

export const TOOL_NAME = 'generate_random_number'

export const TOOL_DESCRIPTION =
  'Generates one or more random integers within a specified range.'

export const TOOL_INPUT_SCHEMA = {
  min: z
    .number()
    .optional()
    .describe('Minimum value (inclusive). Defaults to 0.'),
  max: z
    .number()
    .optional()
    .describe('Maximum value (inclusive). Defaults to 100.'),
  count: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('How many random numbers to generate (1-100). Defaults to 1.'),
}
