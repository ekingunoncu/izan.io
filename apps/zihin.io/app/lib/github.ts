import { Octokit } from "octokit";
import type { ToolIndexEntry, MarketplaceTool, ToolFile } from "./types";

const REPO_OWNER = "ekingunoncu";
const REPO_NAME = "zihin.io";
const BRANCH = "main";

function decodeBase64UTF8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getOctokit() {
  return new Octokit();
}

export async function fetchToolIndex(): Promise<ToolIndexEntry[]> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "tools/index.json",
      ref: BRANCH,
    });

    if ("content" in data) {
      const content = decodeBase64UTF8(data.content);
      return JSON.parse(content) as ToolIndexEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchTool(
  slug: string
): Promise<MarketplaceTool | null> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `tools/${slug}/tool.json`,
      ref: BRANCH,
    });

    if ("content" in data) {
      const content = decodeBase64UTF8(data.content);
      const parsed = JSON.parse(content) as ToolFile;
      return parsed.tool;
    }
    return null;
  } catch {
    return null;
  }
}
