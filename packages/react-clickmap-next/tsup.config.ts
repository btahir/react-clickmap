import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    client: "src/client.ts",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  target: "es2022",
  external: ["react-clickmap", "react"],
  onSuccess: "node ./scripts/client-directive.mjs",
});
