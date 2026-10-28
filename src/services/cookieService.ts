/**
 * Centralized Cookie & Storage Service
 *
 * Provides a unified, type-safe API for reading, writing, and removing browser cookies
 * with automatic fallback to localStorage for restricted or sandboxed iframe environments.
 * Supports string values, JSON objects, custom expiration, and SameSite policies.
 */

export interface CookieOptions {
  /** Days until cookie expiration (default: 365) */
  days?: number;
  /** Cookie path (default: '/') */
  path?: string;
  /** SameSite attribute (default: 'Lax') */
  sameSite?: 'Lax' | 'Strict' | 'None';
  /** Secure flag for HTTPS (default: true if location.protocol is https) */
  secure?: boolean;
}

/**
 * Standard application cookie keys
 */
export const COOKIE_KEYS = {
  THEME: 'nmea_theme',
  SIDEBAR_COLLAPSED: 'nmea_sidebar_collapsed',
  BATCH_SIZE: 'nmea_batch_size',
  RETENTION_WINDOW: 'nmea_retention_window',
  WORKER_COUNT: 'nmea_worker_count',
  DEBUG_MODE: 'nmea_debug_mode',
  DEV_SETTINGS: 'nmea_dev_settings',
} as const;

export type CookieKey = typeof COOKIE_KEYS[keyof typeof COOKIE_KEYS] | (string & {});

// In-memory fallback map if all browser storage is blocked
const memoryFallback = new Map<string, string>();

/**
 * Read a cookie by name (with localStorage and memory fallback)
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  // 1. Try document.cookie
  try {
    const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    if (match) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Cookie reading blocked
  }

  // 2. Fallback to localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const localVal = window.localStorage.getItem(name);
      if (localVal !== null) return localVal;
    }
  } catch {
    // LocalStorage blocked
  }

  // 3. Fallback to in-memory store
  return memoryFallback.get(name) ?? null;
}

/**
 * Write a cookie with options (and mirrors to localStorage for robustness)
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const days = options.days ?? 365;
  const path = options.path ?? '/';
  const sameSite = options.sameSite ?? 'Lax';
  const secure = options.secure ?? (typeof window !== 'undefined' && window.location.protocol === 'https:');

  // Update in-memory fallback
  memoryFallback.set(name, value);

  // 1. Write to document.cookie
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=${path};SameSite=${sameSite}`;
    if (secure) {
      cookieStr += ';Secure';
    }
    document.cookie = cookieStr;
  } catch {
    // Cookie writing blocked
  }

  // 2. Mirror to localStorage as resilient backup
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(name, value);
    }
  } catch {
    // LocalStorage blocked
  }
}

/**
 * Delete a cookie by setting its expiration date in the past
 */
export function deleteCookie(name: string, path = '/'): void {
  memoryFallback.delete(name);

  try {
    document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};SameSite=Lax`;
  } catch {}

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(name);
    }
  } catch {}
}

/**
 * Check if a cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Read and parse a JSON cookie
 */
export function getJSONCookie<T>(name: string, fallback: T | null = null): T | null {
  const raw = getCookie(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serialize and save an object to a cookie
 */
export function setJSONCookie<T>(name: string, value: T, options?: CookieOptions): void {
  try {
    setCookie(name, JSON.stringify(value), options);
  } catch {
    // Serialization error
  }
}

/**
 * Unified Cookie Service Object
 */
export const cookieService = {
  get: getCookie,
  set: setCookie,
  remove: deleteCookie,
  has: hasCookie,
  getJSON: getJSONCookie,
  setJSON: setJSONCookie,
  keys: COOKIE_KEYS,
};
