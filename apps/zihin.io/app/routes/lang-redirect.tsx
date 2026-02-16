import { redirect, useNavigate } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/lang-redirect";
import { detectBrowserLanguage } from "~/i18n";

export function loader({ request }: Route.LoaderArgs) {
  const acceptLang = request.headers.get("Accept-Language") || "";
  let lang = "en";
  if (acceptLang.startsWith("de")) lang = "de";
  else if (acceptLang.startsWith("tr")) lang = "tr";
  else if (acceptLang.startsWith("en")) lang = "en";
  return { redirectTo: `/${lang}` };
}

export function clientLoader() {
  const lang = detectBrowserLanguage();
  return redirect(`/${lang}`);
}

export default function LangRedirect({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const redirectTo = loaderData?.redirectTo;

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [redirectTo, navigate]);

  return null;
}
