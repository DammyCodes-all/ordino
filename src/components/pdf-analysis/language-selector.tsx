"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
];

export function LanguageSelector() {
  const { targetLanguage, setTargetLanguage, stage } = usePdfAnalysis();
  const disabled = stage === "ingesting" || stage === "analyzing";

  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Target language
      <select
        value={targetLanguage}
        disabled={disabled}
        onChange={(event) => setTargetLanguage(event.target.value)}
        className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground disabled:opacity-50"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
