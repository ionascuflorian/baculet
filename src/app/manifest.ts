import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baculet — învață pentru Bacalaureat",
    short_name: "Baculet",
    description:
      "Aplicație de învățat pentru Bacalaureat: materii, teste, streak-uri și prieteni.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1e1e1e",
    theme_color: "#0a7cff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
