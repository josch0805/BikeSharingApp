import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Lastenrad teilen",
        short_name: "Lastenrad",
        description: "Lastenrad und weitere Ressourcen gemeinsam nutzen",
        lang: "de",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f7f4",
        theme_color: "#2f7d4f",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Supabase-Anfragen nie aus dem Cache bedienen
        navigateFallbackDenylist: [/^\/auth/, /^\/rest/],
      },
    }),
  ],
});
