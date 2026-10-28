import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import fs from "node:fs";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Detect Cloud Run / container environment where edge terminates TLS and container must listen on plain HTTP
  const isCloudContainer = Boolean(
    process.env.K_SERVICE ||
    process.env.CONTAINER_NAME ||
    process.env.CLOUD_RUN_EXECUTION,
  );

  // HTTPS requested via mode === 'https' or VITE_DEV_HTTPS=true in .env
  const isHttpsRequested =
    !isCloudContainer && (mode === "https" || env.VITE_DEV_HTTPS === "true");

  // Check custom certificate files (supporting relative and absolute Windows/Linux paths)
  const rawCert = env.VITE_SSL_CERT_PATH || "./certs/cert.pem";
  const rawKey = env.VITE_SSL_KEY_PATH || "./certs/key.pem";
  const certPath = path.isAbsolute(rawCert)
    ? rawCert
    : path.resolve(process.cwd(), rawCert);
  const keyPath = path.isAbsolute(rawKey)
    ? rawKey
    : path.resolve(process.cwd(), rawKey);

  const hasCustomCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  const plugins = [react(), tailwindcss()];

  let httpsConfig: boolean | { key: Buffer; cert: Buffer } | undefined =
    undefined;

  if (isHttpsRequested) {
    if (hasCustomCerts) {
      console.log(
        `\n\x1b[32m✔ [Vite HTTPS] Using custom backend certificates:\x1b[0m\n  Cert: ${certPath}\n  Key:  ${keyPath}\n`,
      );
      httpsConfig = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    } else {
      console.log(
        `\n\x1b[36mℹ [Vite HTTPS] Certificates not found at '${rawCert}'. Auto-generating development SSL certificates...\x1b[0m\n`,
      );
      plugins.push(basicSsl());
      httpsConfig = true;
    }
  }

  const backendUrl =
    env.VITE_BACKEND_URL ||
    `${env.VITE_BACKEND_PROTOCOL || "https"}://${env.VITE_BACKEND_HOST || "127.0.0.1"}:${env.VITE_BACKEND_PORT || "8000"}`;

  return {
    plugins,
    server: {
      https: httpsConfig,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false, // Accepts backend self-signed certificates
        },
      },
      port: 3000,
      host: "0.0.0.0",
    },
  };
});
