import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DOC_CATEGORIES, DOC_ENTRIES } from "~/docs/manifest";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const { t } = useTranslation("common");
  const { lang, slug } = useParams();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (catId: string) =>
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));

  return (
    <nav className="flex flex-col gap-1 py-2">
      {DOC_CATEGORIES.map((cat) => {
        const entries = DOC_ENTRIES.filter((e) => e.category === cat.id);
        const isCollapsed = collapsed[cat.id] ?? false;

        return (
          <div key={cat.id}>
            <button
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(cat.titleKey)}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {entries.map((entry) => {
                  const isActive = slug === entry.slug;
                  return (
                    <Link
                      key={entry.slug}
                      to={`/${lang}/docs/${entry.slug}`}
                      onClick={onNavigate}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {t(entry.titleKey)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
