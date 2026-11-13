import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

void i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en }, fr: { translation: fr }, es: { translation: es } },
  lng: "it",
  fallbackLng: "it",
  interpolation: { escapeValue: false },
});

export default i18n;
