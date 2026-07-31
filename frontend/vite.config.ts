import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
        plugins: [
                react(),
                tailwindcss(),
                // Installable on Android: manifest + service worker. `autoUpdate` matters —
                // without it a cached index.html would pin the app to an old build forever
                // after the first install.
                VitePWA({
                        registerType: "autoUpdate",
                        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
                        manifest: {
                                name: "Tracker",
                                short_name: "Tracker",
                                description: "Personal portfolio, cards, bills and vitals tracker",
                                start_url: "/",
                                scope: "/",
                                display: "standalone",
                                background_color: "#090e12",
                                theme_color: "#090e12",
                                icons: [
                                        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
                                        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
                                        {
                                                src: "/pwa-maskable-512x512.png",
                                                sizes: "512x512",
                                                type: "image/png",
                                                purpose: "maskable",
                                        },
                                ],
                        },
                        workbox: {
                                // Precache the shell only. API responses live on another origin
                                // and must never be served stale.
                                globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
                                navigateFallbackDenylist: [/^\/api\//],
                        },
                }),
        ],
        resolve: {
                alias: {
                        "@": path.resolve(__dirname, "./src"),
                },
        },
});
