import { neon } from '@neondatabase/serverless';

// Returns a neon SQL client.
// neon() is lightweight — it uses HTTP and is safe to call per-request in serverless.
// Usage in route files:
//   const sql = getDb();
//   const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
//   const user = rows[0];
//   await sql`INSERT INTO ...`;
//   // For dynamic queries: await sql('SELECT * WHERE id = $1', [id])

export default function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}
