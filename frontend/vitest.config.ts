import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pure-logic unit tests only (no DOM). Globals are not enabled: import from "vitest" explicitly.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
