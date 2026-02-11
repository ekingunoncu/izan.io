import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDocContent } from "~/docs/loader";
import { DOC_ENTRIES } from "~/docs/manifest";
import type { Route } from "./+types/docs-page";

export function meta({ params }: Route.MetaArgs) {
  const slug = params.slug || "";
  const title = DOC_ENTRIES.some((e) => e.slug === slug)
    ? `${slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} - izan.io Docs`
    : "Documentation - izan.io";
  return [{ title }];
}

export default function DocsPage() {
  const { lang, slug } = useParams();
  const { t } = useTranslation("common");
  const content = getDocContent(lang || "en", slug || "");

  const currentIndex = DOC_ENTRIES.findIndex((e) => e.slug === slug);
  const prev = currentIndex > 0 ? DOC_ENTRIES[currentIndex - 1] : null;
  const next =
    currentIndex < DOC_ENTRIES.length - 1 ? DOC_ENTRIES[currentIndex + 1] : null;

  if (!content) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The documentation page you're looking for doesn't exist.
        </p>
        <Link
          to={`/${lang}/docs`}
          className="text-primary hover:underline font-medium"
        >
          Back to Documentation
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 sm:py-14">
      <article className="docs-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>

      {/* Prev / Next navigation */}
      <nav className="mt-14 pt-6 border-t flex items-center justify-between gap-4">
        {prev ? (
          <Link
            to={`/${lang}/docs/${prev.slug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>{t(prev.titleKey)}</span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            to={`/${lang}/docs/${next.slug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{t(next.titleKey)}</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
}
