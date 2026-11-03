import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://baobab:baobab@localhost:5432/baobab_test" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
