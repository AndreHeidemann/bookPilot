import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export type PrismaAdapter = PrismaBetterSqlite3 | PrismaLibSql;

const logPrisma = (message: string) => {
  console.info(`[prisma] ${message}`);
};

const resolveDatabaseUrl = () =>
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  process.env.LIBSQL_DATABASE_URL ??
  process.env.LIBSQL_URL ??
  null;

const describeRemoteUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
};

export const buildPrismaAdapter = (): PrismaAdapter => {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL (or TURSO_DATABASE_URL) is not configured");
  }

  const isFileUrl = url.startsWith("file:") || !url.includes("://");
  if (isFileUrl) {
    const filePath = url.startsWith("file:") ? url.replace("file:", "") : url;
    const resolvedPath = filePath.startsWith("/") ? filePath : path.resolve(process.cwd(), filePath);
    logPrisma(`Using SQLite file at ${resolvedPath}`);
    return new PrismaBetterSqlite3({ url: `file:${resolvedPath}` });
  }

  const authToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN ?? null;
  if (!authToken) {
    throw new Error("DATABASE_AUTH_TOKEN (or TURSO_AUTH_TOKEN) is required for libsql:// connections");
  }

  logPrisma(`Using libSQL endpoint ${describeRemoteUrl(url)}`);
  return new PrismaLibSql({ url, authToken });
};
