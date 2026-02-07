/**
 * GitHub button with star count. Fetches stars from GitHub API on every page load.
 * Falls back to button without count if API fails (rate limit, etc.).
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Github, Star } from "lucide-react";
import { Button } from "~/components/ui/button";

const GITHUB_REPO_URL = "https://github.com/ekingunoncu/izan.io";
const GITHUB_STARS_PROXY = "/api/github-stars";
const GITHUB_API_URL = "https://api.github.com/repos/ekingunoncu/izan.io";

export function GitHubStarButton() {
  const { t } = useTranslation("common");
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStars() {
      // 1. Try our proxy first (avoids GitHub rate limit)
      try {
        const res = await fetch(GITHUB_STARS_PROXY, { cache: "no-store" });
        const data = await res.json();
        const n = data?.stars;
        if (typeof n === "number") {
          setStars(n);
          return;
        }
      } catch {
        // proxy failed, fall through to GitHub
      }

      // 2. Fallback: direct GitHub API (60 req/hour per IP)
      try {
        const res = await fetch(GITHUB_API_URL, { cache: "no-store" });
        const data = await res.json();
        const n = data?.stargazers_count;
        if (typeof n === "number") {
          setStars(n);
        }
      } catch {
        // show button without count
      }
    }

    fetchStars();
  }, []);

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
            <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
            {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
          </span>
        )}
      </Button>
    </a>
  );
}
