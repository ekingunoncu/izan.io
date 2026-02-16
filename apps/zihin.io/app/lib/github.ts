import { Octokit } from "octokit";
import type { AgentFile, AgentIndexEntry, MarketplaceAgent } from "./types";

const REPO_OWNER = "ekingunoncu";
const REPO_NAME = "zihin.io";
const BRANCH = "main";

function decodeBase64UTF8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeUTF8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function getOctokit(token?: string) {
  return new Octokit(token ? { auth: token } : {});
}

export async function fetchAgentIndex(): Promise<AgentIndexEntry[]> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "agents/index.json",
      ref: BRANCH,
    });

    if ("content" in data) {
      const content = decodeBase64UTF8(data.content);
      return JSON.parse(content) as AgentIndexEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchAgent(
  slug: string
): Promise<MarketplaceAgent | null> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `agents/${slug}/agent.json`,
      ref: BRANCH,
    });

    if ("content" in data) {
      const content = decodeBase64UTF8(data.content);
      const parsed = JSON.parse(content) as AgentFile;
      return parsed.agent;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchAllSlugs(): Promise<string[]> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "agents",
      ref: BRANCH,
    });

    if (Array.isArray(data)) {
      return data
        .filter((item) => item.type === "dir")
        .map((item) => item.name);
    }
    return [];
  } catch {
    return [];
  }
}

export async function createAgentPR(
  accessToken: string,
  agent: MarketplaceAgent
): Promise<string> {
  const userOctokit = new Octokit({ auth: accessToken });

  // Fork the repo (idempotent)
  await userOctokit.rest.repos.createFork({
    owner: REPO_OWNER,
    repo: REPO_NAME,
  });

  // Wait for fork to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get the authenticated user
  const { data: user } = await userOctokit.rest.users.getAuthenticated();

  // Get the latest commit SHA on main
  const { data: ref } = await userOctokit.rest.git.getRef({
    owner: user.login,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
  });

  const branchName = `marketplace/add-${agent.slug}-${Date.now()}`;

  // Create branch
  await userOctokit.rest.git.createRef({
    owner: user.login,
    repo: REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });

  const agentFile: AgentFile = {
    schemaVersion: 1,
    agent,
  };

  // Create agent.json file
  await userOctokit.rest.repos.createOrUpdateFileContents({
    owner: user.login,
    repo: REPO_NAME,
    path: `agents/${agent.slug}/agent.json`,
    message: `feat: add ${agent.name} agent`,
    content: encodeUTF8Base64(JSON.stringify(agentFile, null, 2)),
    branch: branchName,
  });

  // Create PR
  const { data: pr } = await userOctokit.rest.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: `Add agent: ${agent.name}`,
    body: `## New Agent Submission\n\n- **Name**: ${agent.name}\n- **Category**: ${agent.category}\n- **Description**: ${agent.description}\n- **Author**: @${user.login}\n\n---\n\nSubmitted via [zihin.io](https://zihin.io)`,
    head: `${user.login}:${branchName}`,
    base: BRANCH,
  });

  return pr.html_url;
}
