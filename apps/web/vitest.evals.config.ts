import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";
const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(
  process.cwd(),
);
// Vitest sets NODE_ENV=test, for which Next deliberately skips .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  !process.env.ROLEWAY_TEST_OPENROUTER_KEY &&
  !process.env.ROLEWAY_TEST_AI_KEY
)
  throw new Error(
    "Configure ROLEWAY_TEST_AI_KEY or ROLEWAY_TEST_OPENROUTER_KEY before running live evaluations.",
  );
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/evals/**/*.spec.ts"],
    bail: 1,
    testTimeout: 260_000,
    fileParallelism: false,
  },
});
