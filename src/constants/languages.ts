export const PREFERRED_LANGUAGE_OPTIONS = [
  "English",
  "Telugu",
  "Hindi",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Urdu",
  "Odia",
  "Punjabi",
  "Gujarati"
] as const;

export type PreferredLanguage = (typeof PREFERRED_LANGUAGE_OPTIONS)[number] | string;
