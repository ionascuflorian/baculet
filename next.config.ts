import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Permite accesarea serverului de dezvoltare prin tuneluri (ex: Cloudflare
  // Quick Tunnel / trycloudflare), care trimit Origin-ul cu domeniul tunelului.
  // Altfel, requesturile catre /_next/* (inclusiv HMR) primesc 403 "Unauthorized".
  // Adauga aici si alte domenii de tunel pe care le folosesti (ex. `*.ngrok.app`).
  allowedDevOrigins: ["*.trycloudflare.com", "localhost", "*.localhost"],
};

export default nextConfig;
