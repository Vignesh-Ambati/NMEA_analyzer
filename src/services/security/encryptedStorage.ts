/**
 * Encrypted Local Storage Utility
 * 
 * Provides obfuscated/encrypted local storage persistence for developer credentials,
 * relative backend metadata, and engine parameters rather than hardcoding in frontend.
 */

const SALT_KEY = 'NMEA_SEC_VAULT_v1';

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
  }
};
