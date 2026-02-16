import { z } from "zod";
import { AGENT_CATEGORIES } from "./types";

const requiredMCPSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().max(300).optional().default(""),
  headers: z.record(z.string()).optional(),
});

export const agentSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(300, "Description must be at most 300 characters"),
  icon: z.string().min(1, "Icon is required").max(4),
  category: z.enum(AGENT_CATEGORIES as unknown as [string, ...string[]]),
  basePrompt: z
    .string()
    .min(20, "System prompt must be at least 20 characters")
    .max(10000, "System prompt must be at most 10000 characters"),
  tags: z
    .array(z.string().max(30))
    .min(1, "At least one tag is required")
    .max(5, "Maximum 5 tags"),
  examplePrompts: z
    .array(z.string().max(200))
    .max(5, "Maximum 5 example prompts"),
  requiredMCPs: z.array(requiredMCPSchema).max(10).optional().default([]),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(100).max(128000).optional(),
});

export type AgentSubmissionInput = z.infer<typeof agentSubmissionSchema>;
