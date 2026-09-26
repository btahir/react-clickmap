import { existsSync, readFileSync, writeFileSync } from "node:fs";

const path = new URL("../dist/client.js", import.meta.url);
const source = readFileSync(path, "utf8");
if (!source.startsWith('"use client";')) {
  writeFileSync(path, `"use client";\n${source}`);
  const mapPath = new URL("../dist/client.js.map", import.meta.url);
  if (existsSync(mapPath)) {
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    map.mappings = `;${map.mappings ?? ""}`;
    writeFileSync(mapPath, JSON.stringify(map));
  }
}
