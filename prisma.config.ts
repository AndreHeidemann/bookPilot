import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env["DATABASE_URL"] ??
  process.env["TURSO_DATABASE_URL"] ??
  process.env["LIBSQL_DATABASE_URL"] ??
  process.env["LIBSQL_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL (or TURSO_DATABASE_URL) must be set for Prisma CLI commands");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
