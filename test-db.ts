import { Pool } from "pg";

const connectionString = "postgresql://admin:Kvw5CYtWgkprkEIFQsC5pKK1phqIkHmn@dpg-dao27j8473hc73b5rvvg-a.ohio-postgres.render.com/invente_admin?sslmode=require";

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,  
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    console.log("DB Connection OK:", result.rows[0]);

    const tableInfo = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vault_unlocks'
      ORDER BY ordinal_position
    `);
    console.log("vault_unlocks columns:", tableInfo.rows);

    const testInsert = await pool.query(
      "INSERT INTO vault_unlocks (chit_code, team_name, mcq_score) VALUES ($1, $2, $3) RETURNING *",
      ["TEST-CHIT", "Test Team", 2]
    );
    console.log("Test insert result:", testInsert.rows[0]);

    await pool.query("DELETE FROM vault_unlocks WHERE chit_code = $1", ["TEST-CHIT"]);
    console.log("Test cleanup done");

    await pool.end();
  } catch (err) {
    console.error("Error:", err);
    await pool.end();
    process.exit(1);
  }
}

test();