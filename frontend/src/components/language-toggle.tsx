"use client";

import { useApp } from "./provider";

export function LanguageToggle({ className }: { className: string }) {
  const { lang, setLang } = useApp();

  return (
    <button
      type="button"
      className={className}
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      aria-label={lang === "bn" ? "ভাষা বদলান" : "Change language"}
    >
      {lang === "bn" ? "EN" : "বাংলা"}
    </button>
  );
}
