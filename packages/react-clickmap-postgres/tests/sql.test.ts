import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { POSTGRES_INIT_SQL } from "../src/sql";

const initSqlFilePath = fileURLToPath(new URL("../sql/0001_init.sql", import.meta.url));

function extractIndexNames(sql: string): string[] {
  return Array.from(sql.matchAll(/CREATE INDEX IF NOT EXISTS (\w+)/g)).map((match) => match[1]!);
}

describe("POSTGRES_INIT_SQL", () => {
  it("creates the clickmap_events table", () => {
    expect(POSTGRES_INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS clickmap_events");
  });

  it("stays in sync with the clickmap_events indexes shipped in sql/0001_init.sql", () => {
    const initSqlFile = readFileSync(initSqlFilePath, "utf8");
    const fileIndexes = extractIndexNames(initSqlFile).filter((name) =>
      name.startsWith("clickmap_events_"),
    );
    const embeddedIndexes = extractIndexNames(POSTGRES_INIT_SQL);

    expect(fileIndexes.length).toBeGreaterThan(0);
    expect(embeddedIndexes.sort()).toEqual(fileIndexes.sort());
  });
});
