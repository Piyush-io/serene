import type { NextConfig } from "next";

/**
 * Next.js configuration
 * @see https://nextjs.org/docs/api-reference/next.config.js/introduction
 */
const nextConfig: NextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',  // For Google profile pictures
      's.gravatar.com',             // For Gravatar profile pictures
      'firebasestorage.googleapis.com', // For Firebase Storage profile pictures
      'localhost', // For local development
    ],
  },
  // Add any other configurations needed for the application
  productionBrowserSourceMaps: true,
  // Enable source maps in development
  webpack: (config, { dev, isServer }) => {
    if (!isServer && dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
  // Strict mode for better development
  reactStrictMode: true,
  // Improve static file serving
  poweredByHeader: false,
  // Compress responses
  compress: true,
};

export default nextConfig;
