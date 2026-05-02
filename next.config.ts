import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // next-pwa otomatis mencari custom service worker di folder "worker"
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Network-only for API — never cache API responses
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkOnly",
      },
      {
        // Cache-first for static assets
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "bara-static-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // React strict mode for catching issues early
  reactStrictMode: true,
  // Optimize for mobile-first
  experimental: {
    optimizePackageImports: ["@libsql/client"],
  },
};

export default pwaConfig(nextConfig);
