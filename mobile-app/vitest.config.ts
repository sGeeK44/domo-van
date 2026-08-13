import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Metro defines it for every bundle; expo packages read it at import time.
  // tsconfig says "react-native", which Metro compiles and esbuild preserves.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "react-native": path.resolve(__dirname, "__mocks__/react-native.ts"),
      "react-native-ble-plx": path.resolve(
        __dirname,
        "__mocks__/react-native-ble-plx.ts",
      ),
      "expo-secure-store": path.resolve(
        __dirname,
        "__mocks__/expo-secure-store.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
