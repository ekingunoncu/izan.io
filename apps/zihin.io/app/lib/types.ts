export interface ToolAuthor {
  githubUsername: string;
  displayName: string;
  avatarUrl: string;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  enum?: string[];
  default?: string | number | boolean;
}

export interface MarketplaceTool {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  author: ToolAuthor;
  version: string;
  tags: string[];
  parameters: ToolParameter[];
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolIndexEntry {
  slug: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  author: ToolAuthor;
  tags: string[];
  updatedAt: string;
}

export interface ToolFile {
  schemaVersion: number;
  tool: MarketplaceTool;
}

export const TOOL_CATEGORIES = [
  "Social Media",
  "Productivity",
  "E-Commerce",
  "Finance",
  "Education",
  "Entertainment",
  "Travel",
  "Development",
  "Other",
] as const;
