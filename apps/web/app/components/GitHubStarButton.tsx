/**
 * GitHub button with star count. Fetches stars from GitHub API.
 * Falls back to button without count if API fails (rate limit, etc.).
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Github, Star } from "lucide-react";
import { Button } from "~/components/ui/button";

const GITHUB_REPO_URL = "https://github.com/ekingunoncu/izan.io";
const GITHUB_STARS_PROXY = "/api/github-stars";
const GITHUB_API_URL = "https://api.github.com/repos/ekingunoncu/izan.io";
const CACHE_KEY = "izan_github_stars";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedStars(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { count, expires } = JSON.parse(raw);
    if (Date.now() > expires) return null;
    return count;
  } catch {
    return null;
  }
}

function setCachedStars(count: number) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ count, expires: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // ignore
  }
}

export function GitHubStarButton() {
  const { t } = useTranslation("common");
  const [stars, setStars] = useState<number | null>(() => getCachedStars());

  useEffect(() => {
    if (stars !== null) return; // already have cached

    async function fetchStars() {
      // 1. Try our proxy first (avoids GitHub rate limit)
      try {
        const res = await fetch(GITHUB_STARS_PROXY);
        const data = await res.json();
        const n = data?.stars;
        if (typeof n === "number") {
          setStars(n);
          setCachedStars(n);
          return;
        }
      } catch {
        // proxy failed, fall through to GitHub
      }

      // 2. Fallback: direct GitHub API (60 req/hour per IP)
      try {
        const res = await fetch(GITHUB_API_URL);
        const data = await res.json();
        const n = data?.stargazers_count;
        if (typeof n === "number") {
          setStars(n);
          setCachedStars(n);
        }
      } catch {
        // show button without count
      }
    }

    fetchStars();
  }, [stars]);

  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("github.viewOnGitHub")}
    >
      <Button
        variant="outline"
        size="sm"
        className="gap-2 h-10 px-4 rounded-lg font-medium"
      >
        <Github className="h-4 w-4" />
        {t("github.starOnGitHub")}
        {stars !== null && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current" />
            {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
          </span>
        )}
      </Button>
    </a>
  );
}
