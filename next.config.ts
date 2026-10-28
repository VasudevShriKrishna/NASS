import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/**": ["./db/**/*", "./prisma/**/*"],
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/:view(live|ceo-tower|control-tower|procurement|suppliers|import-tracking|bol-intelligence|inventory|receiving|projects|assets|exceptions|actions|assistant|governance|architecture)",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
