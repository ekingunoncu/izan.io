import { Outlet, Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "~/i18n";
import { IzanLogo } from "~/components/ui/izan-logo";
import { useState } from "react";
import { DocsSidebar } from "~/components/docs/DocsSidebar";

const HEADER_H = "h-12";
const HEADER_TOP = "top-12";
const HEADER_PT = "pt-12";

export default function DocsLayout() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <header className={`fixed inset-x-0 top-0 z-50 ${HEADER_H} flex items-center justify-between px-4 sm:px-6 border-b bg-background/90 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 -ml-1.5 rounded hover:bg-muted cursor-pointer text-sm"
          >
            {sidebarOpen ? "\u2715" : "\u2630"}
          </button>
          <Link to={`/${lang}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <IzanLogo className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold tracking-tight">izan.io</span>
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm text-muted-foreground">{t("docs.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/${lang}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.home")}
          </Link>
          <span className="text-xs">
            {SUPPORTED_LANGUAGES.map((l) => (
              <Link
                key={l}
                to={`/${l}/docs`}
                className={`px-1 transition-colors ${l === lang ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"}`}
              >
                {l}
              </Link>
            ))}
          </span>
        </div>
      </header>

      {/* Body below fixed header */}
      <div className={`${HEADER_PT} flex`}>
        {/* Desktop sidebar */}
        <aside className={`hidden lg:block fixed left-0 ${HEADER_TOP} w-60 h-[calc(100vh-3rem)] overflow-y-auto border-r`}>
          <div className="p-4">
            <DocsSidebar />
          </div>
        </aside>
        <div className="hidden lg:block w-60 shrink-0" aria-hidden />

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r shadow-xl lg:hidden ${HEADER_PT} overflow-y-auto`}>
              <div className="p-4">
                <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
              </div>
            </aside>
          </>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
