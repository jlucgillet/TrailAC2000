const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // On ne met jamais en cache les routes de scan/API : la donnée de
  // chronométrage doit toujours venir du serveur, jamais du cache.
  runtimeCaching: [
    {
      urlPattern: /^\/(scan|api)\/.*/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: "CacheFirst",
      options: { cacheName: "google-fonts" },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
