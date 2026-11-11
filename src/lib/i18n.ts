import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
export function createAppI18n() {
  const instance = createInstance();
  void instance.use(initReactI18next).init({ resources: { it: { translation: it }, en: { translation: en }, fr: { translation: fr }, es: { translation: es } }, lng: "it", fallbackLng: "it", initAsync: false, interpolation: { escapeValue: false } });
  return instance;
}
export const localeFor = (language: string) => language.startsWith("en") ? "en-GB" : "it-IT";
