/**
 * GitHub button with star count. Fetches stars from GitHub API on every page load.
 * Falls back to button without count if API fails (rate limit, etc.).
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Button } from "~/components/ui/button";

/** GitHub logo SVG (Lucide's Github icon is deprecated; using inline SVG) */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

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
        <GitHubIcon className="h-4 w-4" />
        {t("github.starOnGitHub")}
        {stars != null && stars > 0 && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
            {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
          </span>
        )}
      </Button>
    </a>
  );
}
