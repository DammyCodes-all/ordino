import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Keep the app root at this package, not a parent lockfile directory.
    root: path.join(__dirname),
  },
  serverExternalPackages: [
    "@napi-rs/canvas",
    "canvas",
    "pdfjs-dist",
    "unpdf",
  ],
};

export default nextConfig;
