import { useParams } from "react-router";
import { useTranslation } from "react-i18next";

export default function SubmitPage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-2xl font-semibold mb-3">{t("submit.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("submit.description")}</p>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="font-medium">{t("submit.howTo")}</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("submit.step1")}</li>
          <li>{t("submit.step2")}</li>
          <li>{t("submit.step3")}</li>
          <li>{t("submit.step4")}</li>
        </ol>
        <div className="flex gap-3 pt-2">
          <a
            href="https://github.com/ekingunoncu/zihin.io/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 border rounded hover:bg-muted transition-colors"
          >
            {t("submit.readGuide")}
          </a>
          <a
            href="https://github.com/ekingunoncu/zihin.io/fork"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 border rounded hover:bg-muted transition-colors"
          >
            {t("submit.forkRepo")}
          </a>
        </div>
      </div>
    </div>
  );
}
