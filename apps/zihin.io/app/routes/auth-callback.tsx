import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { setStoredToken, setStoredUser } from "~/lib/auth";
import { detectBrowserLanguage } from "~/i18n";
import { Octokit } from "octokit";

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError(t("auth.noCode"));
      return;
    }

    exchangeCodeForToken(code)
      .then(async (token) => {
        setStoredToken(token);

        const octokit = new Octokit({ auth: token });
        const { data: user } = await octokit.rest.users.getAuthenticated();
        setStoredUser({
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          html_url: user.html_url,
        });

        window.dispatchEvent(new Event("auth-change"));
        const lang = detectBrowserLanguage();
        navigate(`/${lang}/submit`, { replace: true });
      })
      .catch(() => {
        setError(t("auth.failed"));
      });
  }, [searchParams, navigate, t]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 text-center">
        <div>
          <p className="text-destructive">{error}</p>
          <a
            href="/"
            className="mt-4 block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("auth.backToHome")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          {t("auth.completingSignIn")}
        </p>
      </div>
    </div>
  );
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error("Failed to exchange code for token");
  }

  const data = await res.json();
  return data.access_token;
}
