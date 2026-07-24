import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["canvas", "pdfjs-dist"],
};

export default nextConfig;
