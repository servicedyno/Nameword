// Referral capture — persist a ?ref=CODE from any inbound link so it can be
// attached at sign-up (email or Google). Stored in localStorage until used.
const KEY = "nw_ref";

// Read the ref from the current URL and remember it (does not clear the URL).
export function captureRefFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref");
    if (raw) {
      const code = String(raw).trim().toUpperCase().slice(0, 32);
      if (code) localStorage.setItem(KEY, code);
    }
  } catch {
    /* SSR / storage-disabled — ignore */
  }
}

export function getStoredRef() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function clearStoredRef() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
