import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { IzanLogo } from "~/components/ui/izan-logo";
import {
  getGitHubAuthUrl,
  getStoredUser,
  clearStoredToken,
  type GitHubUser,
} from "~/lib/auth";

export function Header() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [user, setUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    const handler = () => setUser(getStoredUser());
    window.addEventListener("storage", handler);
    window.addEventListener("auth-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("auth-change", handler);
    };
  }, []);

  const handleSignOut = () => {
    clearStoredToken();
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <Link
          to={`/${lang}`}
          className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
        >
          <IzanLogo className="h-8 w-8 sm:h-9 sm:w-9 text-primary" />
          <span className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            zihin.io
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
          <Link to={`/${lang}/agents`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg"
            >
              {t("nav.browse")}
            </Button>
          </Link>
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-7 w-7 rounded-full"
                />
                <span className="hidden font-medium sm:inline">
                  {user.name || user.login}
                </span>
              </div>
              <Link to={`/${lang}/submit`}>
                <Button
                  size="sm"
                  className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t("nav.submitAgent")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 rounded-lg"
                onClick={handleSignOut}
                title={t("nav.signOut")}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <a href={getGitHubAuthUrl()}>
              <Button
                size="sm"
                className="h-11 min-h-[44px] text-sm sm:text-base sm:h-9 sm:min-h-0 px-3 sm:px-4 rounded-lg shadow-sm"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                {t("nav.signIn")}
              </Button>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
