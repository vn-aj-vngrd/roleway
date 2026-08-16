import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@roleway/core", "@roleway/schemas"],
};

export default config;
