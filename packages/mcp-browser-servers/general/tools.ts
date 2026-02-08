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
  handler: async (args) => {
    const { timezone } = getTimeSchema.parse(args)
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timezone ?? 'UTC',
    }
    return new Intl.DateTimeFormat('en-US', options).format(now)
  },
}

const randomNumberSchema = z.object({
  min: z.number().optional().default(0).describe('Minimum (inclusive)'),
  max: z.number().optional().default(100).describe('Maximum (inclusive)'),
})

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
  handler: async (args) => {
    const { min, max } = randomNumberSchema.parse(args)
    if (min > max) throw new Error('min must be <= max')
    const n = Math.floor(Math.random() * (max - min + 1)) + min
    return String(n)
  },
}

const uuid: ToolDef = {
  name: 'uuid',
  description: 'Generates a random UUID v4.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async () => crypto.randomUUID(),
}

const calculateSchema = z.object({
  expression: z
    .string()
    .describe('Math expression (e.g. "2 + 3 * 4"). Only numbers and + - * / ( ) allowed.'),
})

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
  handler: async (args) => {
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
  },
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
  handler: async (args) => {
    const { length, include_symbols } = generatePasswordSchema.parse(args)
    let pool = CHARS.lower + CHARS.upper + CHARS.digit
    if (include_symbols) pool += CHARS.symbol
    const arr = Array.from(
      { length },
      () => pool[Math.floor(Math.random() * pool.length)]
    )
    return arr.join('')
  },
}

export const TOOLS: ToolDef[] = [getTime, randomNumber, uuid, calculate, generatePassword]
