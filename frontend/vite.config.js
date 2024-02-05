import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from 'vite-plugin-pwa';
import generalAssets from "./plugins/general-assets";

export default defineConfig({
  plugins: [
    solidPlugin(),
    generalAssets(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Tasks.md",
        short_name: "Tasks.md",
        description:
          "A self-hosted file based task management board that supports Markdown syntax",
        theme_color: "#1c1c1c",
        background_color: "#1c1c1c",
        icons: [
          {
            src: "favicon/favicon-16x16.png",
            sizes: "16x16",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "favicon/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "favicon/android-chrome-192x192.png",
            sizes: ["144x144", "192x192"],
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "favicon/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: Number(process.env.VITE_PORT)
  },
  build: {
    target: "esnext",
  },
  base: "",
});
