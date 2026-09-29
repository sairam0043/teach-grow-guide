import axios from "axios";
import API_URL from "@/config/api";

/**
 * Attaches the login token to every request this app makes to its own API,
 * and reacts to the server rejecting it.
 *
 * The token has always been stored at `auth_token` on login, but nothing ever
 * sent it back, so the server could not tell who was calling. Registering this
 * once at startup is the client half of the auth work.
 *
 * Imported for its side effect from main.tsx, before anything renders.
 */

const TOKEN_KEY = "auth_token";

/** localStorage throws in some privacy modes; never let that break a request. */
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("user_info");
  } catch {
    /* nothing useful to do */
  }
}

/** Only send credentials to our own backend, never to a third party. */
function isOwnApi(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;          // relative, so same origin
  try {
    return new URL(url, window.location.origin).origin === new URL(API_URL, window.location.origin).origin;
  } catch {
    return false;
  }
}

// --- request: add Authorization ------------------------------------------
axios.interceptors.request.use((config) => {
  const token = readToken();
  if (token && isOwnApi(config.url)) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- response: handle the server rejecting us ----------------------------
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string | undefined = error?.config?.url;

    if (status === 401 && isOwnApi(url)) {
      // The token is missing, expired or tampered with. Drop it and send the
      // user to sign in, preserving where they were so they land back there.
      clearSession();
      const here = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign(`/login?next=${encodeURIComponent(here)}`);
      }
    }

    // 403 is deliberately left alone: the user is signed in, they simply are
    // not allowed to do this. Logging them out would be the wrong response,
    // so the calling screen shows the server's message instead.
    return Promise.reject(error);
  }
);

export {};
