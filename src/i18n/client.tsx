"use client";
import { createContext, useContext } from "react";
import type { Messages } from "./messages/fr";
import type { LocaleCode } from "./config";

const I18nCtx = createContext<{ locale: LocaleCode; m: Messages } | null>(null);

export function I18nProvider({ locale, m, children }: { locale: LocaleCode; m: Messages; children: React.ReactNode }) {
  return <I18nCtx.Provider value={{ locale, m }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n doit être utilisé sous <I18nProvider>.");
  return v;
}
