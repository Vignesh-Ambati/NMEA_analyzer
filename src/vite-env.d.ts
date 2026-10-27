/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_PROTOCOL?: string;
  readonly VITE_BACKEND_HOST?: string;
  readonly VITE_BACKEND_PORT?: string;
  readonly VITE_API_PREFIX?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_BACKEND_PING_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
