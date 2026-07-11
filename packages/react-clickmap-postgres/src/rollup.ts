import type { RollupOptions, RollupResult, SqlExecutor } from "./types";

const MS_PER_DAY = 86_400_000;

function assertTableName(tableName: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`@react-clickmap/postgres: invalid table name "${tableName}"`);
  }

  return tableName;
}

/** Normalize the requested day to a UTC-midnight timestamp. */
function resolveDayStart(day: RollupOptions["day"]): number {
  if (day instanceof Date) {
    return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  }

  if (typeof day === "string") {
    const parsed = Date.parse(`${day}T00:00:00.000Z`);
    if (!Number.isFinite(parsed)) {
      throw new Error(`@react-clickmap/postgres: invalid rollup day "${day}"`);
    }
    return parsed;
  }

  // Default: the previous complete UTC day.
  const now = Date.now();
  return Math.floor(now / MS_PER_DAY) * MS_PER_DAY - MS_PER_DAY;
}

function toIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Aggregate a single UTC day of raw `clickmap_events` into the daily heatmap
 * bin and element-click rollup tables.
 *
 * The rollup is idempotent: it deletes the day's existing rollup rows (scoped
 * to the same project/route filters) and re-inserts them inside a single
 * transaction, so re-running a day is always safe. Both `viewport` and
 * `document` coordinate spaces are rolled up.
 *
 * Run it from a scheduled job (cron, pg_cron, a serverless schedule, etc.) —
 * typically once per day for the previous day. See the README for recipes.
 */
export async function rollupDaily(
  sql: SqlExecutor,
  options: RollupOptions = {},
): Promise<RollupResult> {
  const eventsTable = assertTableName(options.tableName ?? "clickmap_events");
  const binsTable = assertTableName(options.binsTableName ?? "clickmap_heatmap_bins_daily");
  const elementsTable = assertTableName(
    options.elementsTableName ?? "clickmap_element_clicks_daily",
  );

  const dayStart = resolveDayStart(options.day);
  const dayIso = toIsoDay(dayStart);
  const rangeStart = new Date(dayStart);
  const rangeEnd = new Date(dayStart + MS_PER_DAY);

  // Optional scope filters shared by delete + insert so a scoped rollup only
  // ever touches its own rows. The scope params are appended after the
  // statement's fixed params, so the placeholder offset differs between the
  // DELETE statements (1 fixed param) and the INSERT statements (3).
  const scopeValues: Array<{ column: string; value: string }> = [];
  if (options.routeKey) {
    scopeValues.push({ column: "route_key", value: options.routeKey });
  }
  if (options.projectId) {
    scopeValues.push({ column: "project_id", value: options.projectId });
  }

  const buildScopeSql = (fixedParamCount: number): string =>
    scopeValues.length > 0
      ? ` AND ${scopeValues
          .map((scope, index) => `${scope.column} = $${fixedParamCount + index + 1}`)
          .join(" AND ")}`
      : "";

  const scopeParams = scopeValues.map((scope) => scope.value);
  const deleteScopeSql = buildScopeSql(1);
  const insertScopeSql = buildScopeSql(3);
  const scopeSql = insertScopeSql;

  // $1 = day (date), $2 = range start, $3 = range end, then scope params.
  const insertParams = [dayIso, rangeStart, rangeEnd, ...scopeParams];

  const binsSelect = (
    space: "viewport" | "document",
    xCol: string,
    yCol: string,
    wCol: string,
    hCol: string,
  ): string => `
    INSERT INTO ${binsTable} (
      day, project_id, route_key, page_path, device_type,
      coordinate_space, x_bucket, y_bucket, value, ref_w, ref_h
    )
    SELECT
      $1::date,
      project_id,
      route_key,
      page_path,
      device_type,
      '${space}',
      ROUND(${xCol})::smallint,
      ROUND(${yCol})::smallint,
      SUM(CASE WHEN is_rage_click THEN 2 ELSE 1 END)::double precision,
      MAX(${wCol}),
      MAX(${hCol})
    FROM ${eventsTable}
    WHERE occurred_at >= $2 AND occurred_at < $3
      AND ${xCol} IS NOT NULL AND ${yCol} IS NOT NULL${scopeSql}
    GROUP BY project_id, route_key, page_path, device_type, ROUND(${xCol}), ROUND(${yCol})
  `;

  await sql.query("BEGIN");

  try {
    // Serialize concurrent rollups for the same day/scope. Without this,
    // two overlapping runs (an overlapping cron tick, a manual retry racing
    // the scheduler, a backfill script launched twice) can both pass the
    // DELETE step before either INSERTs, then both attempt to INSERT the
    // same (day, project, route, page, device, coordinate_space, x, y)
    // primary key, and the second run fails with a unique_violation instead
    // of the "safe to re-run" behavior the idempotency contract promises.
    // The lock is scoped to this rollup's tables + day + scope so unrelated
    // days/scopes/tables never contend, and it is released automatically on
    // COMMIT/ROLLBACK since it's an xact-level advisory lock.
    const lockKey = `${binsTable}:${elementsTable}:${dayIso}:${options.routeKey ?? ""}:${options.projectId ?? ""}`;
    await sql.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockKey]);

    await sql.query(`DELETE FROM ${binsTable} WHERE day = $1::date${deleteScopeSql}`, [
      dayIso,
      ...scopeParams,
    ]);
    await sql.query(`DELETE FROM ${elementsTable} WHERE day = $1::date${deleteScopeSql}`, [
      dayIso,
      ...scopeParams,
    ]);

    const viewportInsert = await sql.query(
      binsSelect("viewport", "x_pct", "y_pct", "viewport_w", "viewport_h"),
      insertParams,
    );
    const documentInsert = await sql.query(
      binsSelect("document", "doc_x_pct", "doc_y_pct", "doc_w", "doc_h"),
      insertParams,
    );

    const elementInsert = await sql.query(
      `
      INSERT INTO ${elementsTable} (
        day, project_id, route_key, page_path, selector_masked_path,
        clicks, rage_clicks, dead_clicks
      )
      SELECT
        $1::date,
        project_id,
        route_key,
        page_path,
        selector_masked_path,
        COUNT(*) FILTER (WHERE event_type = 'click')::integer,
        COUNT(*) FILTER (WHERE event_type = 'rage-click')::integer,
        COUNT(*) FILTER (WHERE event_type = 'dead-click')::integer
      FROM ${eventsTable}
      WHERE occurred_at >= $2 AND occurred_at < $3
        AND selector_masked_path IS NOT NULL
        AND event_type IN ('click', 'rage-click', 'dead-click')${scopeSql}
      GROUP BY project_id, route_key, page_path, selector_masked_path
    `,
      insertParams,
    );

    await sql.query("COMMIT");

    return {
      day: dayIso,
      binRows: (viewportInsert.rowCount ?? 0) + (documentInsert.rowCount ?? 0),
      elementRows: elementInsert.rowCount ?? 0,
    };
  } catch (error) {
    await sql.query("ROLLBACK").catch(() => {
      // Best-effort rollback; surface the original error below.
    });
    throw error;
  }
}
