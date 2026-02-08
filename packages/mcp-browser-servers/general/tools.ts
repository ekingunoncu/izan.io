/**
 * @izan/mcp-browser-servers - General purpose tools (client-side)
 * get_time, random_number, uuid, calculate, generate_password
 */

import { z } from 'zod'

type ToolDef = {
  name: string
  description: string
  inputSchema: object
  handler: (args: Record<string, unknown>) => Promise<string>
}

const getTimeSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone (e.g. Europe/Istanbul). Defaults to UTC.'),
})

export async function handleGetTime(args: Record<string, unknown>): Promise<string> {
  const { timezone } = getTimeSchema.parse(args)
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: timezone ?? 'UTC',
  }
  return new Intl.DateTimeFormat('en-US', options).format(now)
}

const getTime: ToolDef = {
  name: 'get_time',
  description: 'Returns the current date and time. Optionally accepts a timezone.',
  inputSchema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'IANA timezone (e.g. Europe/Istanbul). Defaults to UTC.',
      },
    },
  },
  handler: handleGetTime,
}

const randomNumberSchema = z.object({
  min: z.number().optional().default(0).describe('Minimum (inclusive)'),
  max: z.number().optional().default(100).describe('Maximum (inclusive)'),
})

export async function handleRandomNumber(args: Record<string, unknown>): Promise<string> {
  const { min, max } = randomNumberSchema.parse(args)
  if (min > max) throw new Error('min must be <= max')
  const n = Math.floor(Math.random() * (max - min + 1)) + min
  return String(n)
}

const randomNumber: ToolDef = {
  name: 'random_number',
  description: 'Generates a random integer between min and max (inclusive).',
  inputSchema: {
    type: 'object',
    properties: {
      min: { type: 'number', description: 'Minimum (inclusive)' },
      max: { type: 'number', description: 'Maximum (inclusive)' },
    },
  },
  handler: handleRandomNumber,
}

export async function handleUuid(_args: Record<string, unknown>): Promise<string> {
  return crypto.randomUUID()
}

const uuid: ToolDef = {
  name: 'uuid',
  description: 'Generates a random UUID v4.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: handleUuid,
}

const calculateSchema = z.object({
  expression: z
    .string()
    .describe('Math expression (e.g. "2 + 3 * 4"). Only numbers and + - * / ( ) allowed.'),
})

export async function handleCalculate(args: Record<string, unknown>): Promise<string> {
  const { expression } = calculateSchema.parse(args)
  const sanitized = expression.replaceAll(/\s/g, '')
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error('Only numbers and + - * / ( ) allowed')
  }
  const result = new Function(`"use strict"; return (${sanitized})`)()
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new TypeError('Invalid expression')
  }
  return String(result)
}

const calculate: ToolDef = {
  name: 'calculate',
  description: 'Evaluates a simple math expression. Supports +, -, *, /, parentheses. Only numbers allowed.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Math expression (e.g. "2 + 3 * 4")',
      },
    },
    required: ['expression'],
  },
  handler: handleCalculate,
}

const generatePasswordSchema = z.object({
  length: z.number().min(8).max(64).optional().default(16).describe('Password length'),
  include_symbols: z.boolean().optional().default(true).describe('Include !@#$%^&*'),
})

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digit: '0123456789',
  symbol: '!@#$%^&*',
}

export async function handleGeneratePassword(args: Record<string, unknown>): Promise<string> {
  const { length, include_symbols } = generatePasswordSchema.parse(args)
  let pool = CHARS.lower + CHARS.upper + CHARS.digit
  if (include_symbols) pool += CHARS.symbol
  const arr = Array.from(
    { length },
    () => pool[Math.floor(Math.random() * pool.length)]
  )
  return arr.join('')
}

const generatePassword: ToolDef = {
  name: 'generate_password',
  description: 'Generates a random secure password.',
  inputSchema: {
    type: 'object',
    properties: {
      length: { type: 'number', description: 'Password length (8-64)' },
      include_symbols: { type: 'boolean', description: 'Include special characters' },
    },
  },
  handler: handleGeneratePassword,
}

export const TOOLS: ToolDef[] = [getTime, randomNumber, uuid, calculate, generatePassword]
