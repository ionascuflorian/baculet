export type CookieConsent = "accepted" | "rejected";

export const CONSENT_COOKIE = "baculet-consent";
export const CONSENT_STORAGE_KEY = "baculet:consent";

const VALID_VALUES = new Set<string>(["accepted", "rejected"]);

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function normalize(value: string | null | undefined): CookieConsent | null {
  if (value && VALID_VALUES.has(value)) return value as CookieConsent;
  return null;
}

// Citește alegerea dintr-un cookie (folosit de server / SSR).
export function consentFromCookieValue(value: string | null | undefined): CookieConsent | null {
  return normalize(value);
}

// Client: citește alegerea salvată (cookie + localStorage ca oglindă).
export function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const fromStorage = normalize(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  if (fromStorage) return fromStorage;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return normalize(raw ? decodeURIComponent(raw) : null);
}

// Client: salvează alegerea în cookie + localStorage. Folosit de banner.
export function storeConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // localStorage indisponibil (ex. mod privat strict) — merge cookie-ul.
  }
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toUTCString();
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    value
  )}; path=/; max-age=${MAX_AGE_SECONDS}; expires=${expires}; SameSite=Lax`;
}

// Punctul unic de verificare pentru orice funcționalitate care depinde de
// consimțământ (ex. analytics viitoare). Când se adaugă un script terț, se
// poate găti aici pe categorii. Acum site-ul nu încarcă niciun script terț.
export function hasConsent(consent: CookieConsent | null): boolean {
  return consent === "accepted";
}