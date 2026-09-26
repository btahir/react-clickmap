import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { POSTGRES_INIT_SQL } from "../src/sql";

const initSqlFilePath = fileURLToPath(new URL("../sql/0001_init.sql", import.meta.url));
const docCoordinatesSqlFilePath = fileURLToPath(
  new URL("../sql/0002_document_coordinates.sql", import.meta.url),
);

function extractIndexNames(sql: string): string[] {
  return Array.from(sql.matchAll(/CREATE INDEX IF NOT EXISTS (\w+)/g)).map((match) => match[1]!);
}

/** Extract the column names declared inside a `CREATE TABLE IF NOT EXISTS <table> ( ... )` block. */
function extractCreateTableColumns(sql: string, tableName: string): string[] {
  const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(([\\s\\S]*?)\\n\\);`);
  const match = pattern.exec(sql);
  if (!match?.[1]) {
    throw new Error(`Could not find CREATE TABLE block for ${tableName}`);
  }

  return (
    match[1]
      .split(",\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/)[0]!)
      // Skip table-level constraints (no column of that "name" exists).
      .filter((token) => !/^(PRIMARY|UNIQUE|CONSTRAINT|CHECK|FOREIGN)$/i.test(token))
  );
}

/** Extract columns added via `ADD COLUMN IF NOT EXISTS <name> ...` for a given table's ALTER block. */
function extractAddedColumns(sql: string, tableName: string): string[] {
  const alterBlockPattern = new RegExp(`ALTER TABLE ${tableName}\\s+([\\s\\S]*?);`, "g");
  const columns: string[] = [];
  for (const alterMatch of sql.matchAll(alterBlockPattern)) {
    const block = alterMatch[1] ?? "";
    for (const columnMatch of block.matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/g)) {
      columns.push(columnMatch[1]!);
    }
  }
  return columns;
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

  it("stays in sync with the clickmap_events columns shipped in sql/0001_init.sql", () => {
    const initSqlFile = readFileSync(initSqlFilePath, "utf8");
    const fileColumns = extractCreateTableColumns(initSqlFile, "clickmap_events");
    const embeddedColumns = extractCreateTableColumns(POSTGRES_INIT_SQL, "clickmap_events");

    expect(fileColumns.length).toBeGreaterThan(0);
    // 0001's base columns must all be present in the embedded quick-setup
    // table (0002 adds more on top of that in the file, covered below).
    for (const column of fileColumns) {
      expect(embeddedColumns).toContain(column);
    }
  });

  it("embeds the doc_x_pct/doc_y_pct/doc_w/doc_h columns added by sql/0002_document_coordinates.sql", () => {
    const docCoordinatesSqlFile = readFileSync(docCoordinatesSqlFilePath, "utf8");
    const addedColumns = extractAddedColumns(docCoordinatesSqlFile, "clickmap_events");
    const embeddedColumns = extractCreateTableColumns(POSTGRES_INIT_SQL, "clickmap_events");

    // Guards against 0002 (or a future migration) adding a column to
    // clickmap_events that the embedded POSTGRES_INIT_SQL quick-setup string
    // forgets to pick up, which would silently desync a fresh install (using
    // POSTGRES_INIT_SQL) from one bootstrapped via the migration files.
    expect(addedColumns).toEqual(["doc_x_pct", "doc_y_pct", "doc_w", "doc_h"]);
    for (const column of addedColumns) {
      expect(embeddedColumns).toContain(column);
    }
  });
});
