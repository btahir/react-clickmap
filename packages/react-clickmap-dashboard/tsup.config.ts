import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  target: "es2022",
  external: ["react", "react-dom", "react-clickmap"],
  // See react-clickmap's tsup.config.ts / scripts/prepend-use-client.mjs for
  // why this can't be done with `banner` or an esbuild plugin: neither
  // survives tsup's own post-processing pipeline.
  onSuccess: "node ./scripts/prepend-use-client.mjs",
});
