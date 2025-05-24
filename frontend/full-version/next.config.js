/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Disable unnecessary features in development
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // Simplify webpack config
  webpack: (config) => {
    // Disable source maps in development
    if (process.env.NODE_ENV === 'development') {
      config.devtool = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        // apply to every route in your app
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              // Combine all image sources into one img-src directive
              "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com https://jpydgtzmbcwbyufpvupp.supabase.co",
              // default
              "default-src 'self'",
              // Must allow blob: + data: for the SDK's inline workers
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
              // Explicit worker-src too (fallback to script-src if omitted)
              "worker-src 'self' blob: data:",
              // allow Azure Speech websockets + Geoapify + Supabase
              "connect-src 'self' https://speechdev.onrender.com " +
                "ws://speechdev.onrender.com wss://speechdev.onrender.com " +
                "wss://*.s2s.speech.microsoft.com wss://*.tts.speech.microsoft.com " +
                "https://api.geoapify.com " +
                "https://jpydgtzmbcwbyufpvupp.supabase.co",
              // Allow blob: for audio playback
              "media-src 'self' blob:",
              // the rest of your assets
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'"
            ].join("; "),
          },
        ],
      },
    ];
  },
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;