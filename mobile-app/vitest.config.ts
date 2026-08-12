import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "react-native": path.resolve(__dirname, "__mocks__/react-native.ts"),
      "react-native-ble-plx": path.resolve(
        __dirname,
        "__mocks__/react-native-ble-plx.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
