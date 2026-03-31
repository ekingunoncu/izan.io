import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t py-6">
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} zihin.io</span>
        <div className="flex items-center gap-4">
          <a href="https://izan.io" className="hover:text-foreground transition-colors">izan.io</a>
          <a href="https://github.com/ekingunoncu/zihin.io" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
