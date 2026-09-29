import { defineConfig } from "vitest/config";

// `npm run test:coverage` covers the CLI and the core's scripts (guards, hooks), which tests import
// from ../core. Scripts that tests run as separate processes aren't counted.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "**/core/**/*.mjs"],
      allowExternal: true,
      reporter: ["text-summary", "text"],
    },
  },
});
