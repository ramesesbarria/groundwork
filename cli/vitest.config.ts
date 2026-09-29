import { defineConfig } from "vitest/config";

// `npm run test:coverage` covers the CLI and the core's scripts (guards, hooks), which tests import
// from ../core. Scripts that tests run as separate processes aren't counted.
export default defineConfig({
  test: {
    // Many tests start real processes (hooks, git, the built CLI), which is slow on Windows CI runners.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "**/core/**/*.mjs"],
      allowExternal: true,
      reporter: ["text-summary", "text"],
    },
  },
});
