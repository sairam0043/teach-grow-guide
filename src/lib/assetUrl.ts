import API_URL from "@/config/api";

const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();

export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // Keep external avatar/image providers untouched.
  if (/^https?:\/\/ui-avatars\.com\//i.test(trimmed)) return trimmed;

  // Convert stored localhost asset URLs to deployed backend origin.
  if (/^https?:\/\/localhost:\d+\/uploads\//i.test(trimmed) || /^https?:\/\/127\.0\.0\.1:\d+\/uploads\//i.test(trimmed)) {
    return apiOrigin ? `${apiOrigin}${trimmed.replace(/^https?:\/\/[^/]+/, "")}` : trimmed;
  }

  // Upgrade known backend HTTP URLs to HTTPS to avoid mixed-content warnings.
  if (/^http:\/\/cuvasol-tutor\.onrender\.com\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  // If backend returns a relative uploads path, prepend API origin.
  if (trimmed.startsWith("/uploads/")) {
    return apiOrigin ? `${apiOrigin}${trimmed}` : trimmed;
  }

  return trimmed;
};
