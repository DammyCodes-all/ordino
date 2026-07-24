import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@napi-rs/canvas", "canvas", "pdfjs-dist"],
};

export default nextConfig;
