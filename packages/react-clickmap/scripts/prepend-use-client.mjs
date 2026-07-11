import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// esbuild (and tsup's post-processing on top of it) strips module-level
// directives like "use client" out of bundled output -- even when
// reinjected via `banner` or an esbuild onEnd plugin, they don't survive to
// the file tsup actually writes to disk. The reliable fix is to prepend the
// directive to the already-built file ourselves, once bundling is done.
//
// This runs as tsup's `onSuccess` hook, so it applies to both `build` and
// `dev --watch`.

const DIRECTIVE = '"use client";';

function prependDirective(jsPath) {
  if (!existsSync(jsPath)) {
    console.warn(`prepend-use-client: ${jsPath} not found, skipping.`);
    return;
  }

  const original = readFileSync(jsPath, "utf8");
  if (original.startsWith(DIRECTIVE)) {
    // Already applied (e.g. re-run without a clean build).
    return;
  }

  writeFileSync(jsPath, `${DIRECTIVE}\n${original}`);

  const mapPath = `${jsPath}.map`;
  if (existsSync(mapPath)) {
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    // Inserting exactly one new line at the top of the file means every
    // existing mapping needs to shift down by one generated line. In the
    // sourcemap `mappings` format, each `;` advances to the next generated
    // line, so prepending a single `;` shifts the whole map by one line
    // without needing to re-encode any VLQ segments.
    map.mappings = `;${map.mappings ?? ""}`;
    writeFileSync(mapPath, JSON.stringify(map));
  }

  console.log(`prepend-use-client: added "use client" directive to ${jsPath}`);
}

prependDirective(resolve(process.cwd(), "dist/index.js"));
