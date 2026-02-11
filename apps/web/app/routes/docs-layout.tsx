import { Outlet, Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Menu, X } from "lucide-react";
import { useState } from "react";
import { DocsSidebar } from "~/components/docs/DocsSidebar";
import { Button } from "~/components/ui/button";

export default function DocsLayout() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <Link
              to={`/${lang}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold tracking-tight">
                izan.io
              </span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{t("docs.title")}</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to={`/${lang}`}>
              <Button variant="ghost" size="sm" className="text-sm">
                {t("nav.agents")}
              </Button>
            </Link>
            <Link to="/chat">
              <Button size="sm" className="text-sm">
                {t("nav.startChat")}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r bg-muted/30 dark:bg-muted/10 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-4">
            <DocsSidebar />
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl lg:hidden pt-[57px] overflow-y-auto">
              <div className="p-4">
                <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
              </div>
            </aside>
          </>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
