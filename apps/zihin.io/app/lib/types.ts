export interface AgentAuthor {
  githubUsername: string;
  displayName: string;
  avatarUrl: string;
}

export interface RequiredMCP {
  name: string;
  url: string;
  description: string;
  headers?: Record<string, string>;
}

export interface MacroToolParameter {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  enum?: string[];
  default?: string | number | boolean;
}

export interface MacroToolStep {
  action: string;
  label?: string;
  continueOnError?: boolean;
  [key: string]: unknown;
}

export interface MacroTool {
  name: string;
  displayName: string;
  description: string;
  version: string;
  parameters: MacroToolParameter[];
  steps: MacroToolStep[];
  lanes?: Array<{ name: string; steps: MacroToolStep[] }>;
  viewport?: { width: number; height: number };
}

export interface MacroServer {
  name: string;
  description: string;
  category: string;
  tools: MacroTool[];
}

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  basePrompt: string;
  category: string;
  author: AgentAuthor;
  version: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  examplePrompts: string[];
  requiredMCPs?: RequiredMCP[];
  macros?: { servers: MacroServer[] };
  implicitMCPIds?: string[];
  extensionMCPIds?: string[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  color?: string;
}

export interface AgentIndexEntry {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  author: AgentAuthor;
  tags: string[];
  updatedAt: string;
}

export interface AgentFile {
  schemaVersion: number;
  agent: MarketplaceAgent;
}

export const AGENT_CATEGORIES = [
  "Development",
  "Writing",
  "Marketing",
  "Data",
  "Design",
  "Productivity",
  "Education",
  "Finance",
  "Other",
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];
