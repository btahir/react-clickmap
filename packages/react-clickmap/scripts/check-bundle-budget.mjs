import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const target = resolve(process.cwd(), "dist/index.js");

try {
  const file = readFileSync(target, "utf8");
  const gzSize = gzipSync(file).byteLength;
  const budget = 18 * 1024;

  if (gzSize > budget) {
    console.error(`Bundle budget exceeded: ${gzSize} bytes gzipped (budget ${budget}).`);
    process.exit(1);
  }

  console.log(`Bundle budget ok: ${gzSize} bytes gzipped.`);
} catch {
  console.error("Missing dist/index.js. Run build first.");
  process.exit(1);
}
