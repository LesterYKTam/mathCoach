import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // Emit [TEST] logs during test runs
    env: { LOG_LEVEL: "TEST" },
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    reporters: ["verbose"],
  },
});
