import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/**": ["./db/**/*", "./prisma/**/*"],
  },
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/customer-tracking",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/:view(customer-tracking|live|ceo-tower|control-tower|procurement|suppliers|import-tracking|bol-intelligence|inventory|receiving|projects|assets|exceptions|actions|assistant|governance|architecture)",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
