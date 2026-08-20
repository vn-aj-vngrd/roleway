import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@roleway/core", "@roleway/schemas"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default config;
