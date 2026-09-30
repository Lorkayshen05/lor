import { execSync } from "node:child_process";
import pg from "pg";

/** Truncates and re-seeds the e2e database. Runs before `next build` so prerendered pages contain seed data. */
async function main() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://bekusegar:bekusegar_dev@localhost:5432/bekusegar_e2e";
  const env = { ...process.env, DATABASE_URL: url, ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "admin-dev-password-1" };
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`); // e2e DB only
  await client.end();
  execSync("npx prisma db seed", { env, stdio: "pipe" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
