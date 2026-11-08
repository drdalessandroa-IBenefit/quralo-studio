import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  return <div className="flex shrink-0 gap-1" role="group" aria-label={t("common.language")}>{["it", "en"].map(lang => <Button key={lang} size="sm" variant={i18n.language === lang ? "secondary" : "ghost"} aria-pressed={i18n.language === lang} onClick={() => { void i18n.changeLanguage(lang); localStorage.setItem("quralo-language", lang); }}>{lang.toUpperCase()}</Button>)}</div>;
}
