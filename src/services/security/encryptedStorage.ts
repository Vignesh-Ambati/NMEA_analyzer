/**
 * Encrypted Local Storage Utility
 * 
 * Provides obfuscated/encrypted local storage persistence for developer credentials,
 * relative backend metadata, and engine parameters rather than hardcoding in frontend.
 */

const SALT_KEY = 'NMEA_SEC_VAULT_v1';
const APP_STORAGE_PREFIXES = ['_enc_', 'nmea_'];

function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export const encryptedStorage = {
  setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const obfuscated = xorCipher(serialized, SALT_KEY);
      const encoded = btoa(encodeURIComponent(obfuscated));
      localStorage.setItem(`_enc_${key}`, encoded);
    } catch {
      // fallback
    }
  },

  getItem<T = any>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`_enc_${key}`);
      if (!stored) return defaultValue;
      const decoded = decodeURIComponent(atob(stored));
      const deobfuscated = xorCipher(decoded, SALT_KEY);
      return JSON.parse(deobfuscated) as T;
    } catch {
      return defaultValue;
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(`_enc_${key}`);
    } catch {
      // fallback
    }
  },

  clearAllAppState(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }
};
