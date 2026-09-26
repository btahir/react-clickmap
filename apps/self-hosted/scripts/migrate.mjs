import { POSTGRES_INIT_SQL } from "@react-clickmap/postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(POSTGRES_INIT_SQL);
  console.log("Clickmap schema ready");
} finally {
  await pool.end();
}
