import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "clickmap-packed-"));
const run = (cmd, args, cwd = temp) =>
  execFileSync(cmd, args, {
    cwd,
    stdio: "pipe",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    maxBuffer: 20 * 1024 * 1024,
  }).toString();
try {
  const tar = join(temp, "tar");
  mkdirSync(tar);
  const dependencies = {
    next: "16.1.6",
    react: "19.2.4",
    "react-dom": "19.2.4",
    typescript: "5.9.3",
    "@types/node": "25.3.3",
    "@types/react": "19.2.14",
  };
  for (const folder of readdirSync(join(root, "packages"))) {
    const dir = join(root, "packages", folder);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json")));
    run("pnpm", ["pack", "--pack-destination", tar], dir);
    const file = readdirSync(tar).find(
      (n) => n === `${pkg.name.replace("@", "").replace("/", "-")}-${pkg.version}.tgz`,
    );
    assert.ok(file, `tarball ${pkg.name}`);
    dependencies[pkg.name] = `file:${join(tar, file)}`;
    const listing = run("tar", ["-tzf", join(tar, file)]);
    assert.match(listing, /package\/README.md/);
    assert.match(listing, /package\/LICENSE/);
  }
  writeFileSync(
    join(temp, "package.json"),
    JSON.stringify({ private: true, type: "module", dependencies }),
  );
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  const pure = run("node", [
    "--input-type=module",
    "-e",
    `import {createEvidence,buildReport} from 'react-clickmap/contracts';import {createClickmapRouteHandlers} from '@react-clickmap/next/server';import {createPostgresAdapter} from '@react-clickmap/postgres'; console.log(buildReport(createEvidence([])).totalEvents,typeof createClickmapRouteHandlers,typeof createPostgresAdapter)`,
  ]);
  assert.match(pure, /function function/);
  assert.ok(
    !readFileSync(join(temp, "node_modules/react-clickmap/dist/contracts.js"), "utf8").includes(
      '"use client"',
    ),
  );
  assert.ok(
    readFileSync(
      join(temp, "node_modules/@react-clickmap/dashboard/dist/index.js"),
      "utf8",
    ).startsWith('"use client"'),
  );
  mkdirSync(join(temp, "app/api/clickmap"), { recursive: true });
  writeFileSync(
    join(temp, "app/layout.tsx"),
    `export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>}`,
  );
  writeFileSync(
    join(temp, "app/page.tsx"),
    `import {createEvidence} from 'react-clickmap/contracts';import Studio from './studio';export default function Page(){return <main><h1>{createEvidence([]).schema}</h1><Studio/></main>}`,
  );
  writeFileSync(
    join(temp, "app/studio.tsx"),
    `'use client';import {ClickmapStudio} from '@react-clickmap/dashboard';import {memoryAdapter} from 'react-clickmap';const adapter=memoryAdapter();export default function Studio(){return <ClickmapStudio adapter={adapter} projectId="packed"/>}`,
  );
  writeFileSync(
    join(temp, "app/api/clickmap/route.ts"),
    `import {createClickmapRouteHandlers} from '@react-clickmap/next/server';const adapter={save:async()=>{},load:async()=>[]};export const {GET,POST,DELETE}=createClickmapRouteHandlers(adapter,{projectId:'packed',authorize:()=>false});`,
  );
  writeFileSync(
    join(temp, "tsconfig.json"),
    readFileSync(join(root, "apps/self-hosted/tsconfig.json")),
  );
  run("npm", ["exec", "next", "build"]);
  console.log(
    "PASS: all six tarballs include README/license; isolated Node contracts/server imports; real Next App Router production consumer builds from packed dependencies.",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
