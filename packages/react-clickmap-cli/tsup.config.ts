import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  target: "node22",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: ["react-clickmap"],
});
