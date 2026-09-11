import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  env: {
    // Versiunea afișată pe site (footer + Cont) urmează automat package.json.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  turbopack: {
    // Explicit: există un package-lock.json accidental în directorul home
    // care face ca inferarea root-ului să eșueze (rute 404 în dev).
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // pdf-parse/pdfjs/mammoth sunt încărcate la runtime din node_modules (nu
  // bundle-uite de Turbopack). Bundle-ul de producție evaluează altfel
  // sub-modulele (ex. DOMMatrix lipsă la module-evaluation pe Vercel, doar în
  // build): externalizarea rezolvă ordinea de instanțiere.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth", "dommatrix"],
  // Permite accesarea serverului de dezvoltare prin tuneluri (ex: Cloudflare
  // Quick Tunnel / trycloudflare), care trimit Origin-ul cu domeniul tunelului.
  // Altfel, requesturile catre /_next/* (inclusiv HMR) primesc 403 "Unauthorized".
  // Adauga aici si alte domenii de tunel pe care le folosesti (ex. `*.ngrok.app`).
  allowedDevOrigins: ["*.trycloudflare.com", "localhost", "*.localhost"],
};

export default nextConfig;
