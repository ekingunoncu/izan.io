const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export function getGitHubAuthUrl(): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://zihin.io";
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: "public_repo",
    redirect_uri: `${origin}/auth/callback`,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem("gh_token");
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem("gh_token", token);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem("gh_token");
  sessionStorage.removeItem("gh_user");
}

export function getStoredUser(): GitHubUser | null {
  try {
    const raw = sessionStorage.getItem("gh_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: GitHubUser): void {
  sessionStorage.setItem("gh_user", JSON.stringify(user));
}
