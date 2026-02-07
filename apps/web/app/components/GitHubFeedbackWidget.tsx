/**
 * Floating widget for bug reports and feature requests.
 * Links directly to GitHub new issue form with bug report template.
 */
import { useTranslation } from "react-i18next";
import { Bug } from "lucide-react";
import { Button } from "~/components/ui/button";

const GITHUB_NEW_ISSUE_URL =
  "https://github.com/ekingunoncu/izan.io/issues/new?template=bug_report.md";

export function GitHubFeedbackWidget() {
  const { t } = useTranslation("common");

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden md:block">
      <a
        href={GITHUB_NEW_ISSUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("github.feedbackAria")}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full shadow-lg border-2 bg-background/80 backdrop-blur hover:bg-muted/80"
          title={t("github.feedbackTooltip")}
        >
          <Bug className="h-5 w-5" />
        </Button>
      </a>
    </div>
  );
}
