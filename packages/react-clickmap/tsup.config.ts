import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    contracts: "src/contracts.ts",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  target: "es2022",
  external: ["react", "react-dom"],
  // The runtime index exports client components/hooks, so that built
  // entry needs a "use client" directive. The pure contracts entry does not. esbuild strips module-level
  // directives from bundled output (both a plain `banner` and an
  // onEnd-based esbuild plugin like esbuild-plugin-preserve-directives get
  // silently dropped again somewhere in tsup's own post-processing --
  // verified empirically against this exact build). Prepending it to the
  // written file (and shifting the sourcemap to match) after tsup finishes
  // is the reliable fix; see scripts/prepend-use-client.mjs.
  onSuccess: "node ./scripts/prepend-use-client.mjs",
});
