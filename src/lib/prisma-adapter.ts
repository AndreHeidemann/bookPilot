import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export type PrismaAdapter = PrismaBetterSqlite3 | PrismaLibSql;

export const buildPrismaAdapter = (): PrismaAdapter => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  const isFileUrl = url.startsWith("file:") || !url.includes("://");
  if (isFileUrl) {
    const filePath = url.startsWith("file:") ? url.replace("file:", "") : url;
    const resolvedPath = filePath.startsWith("/") ? filePath : path.resolve(process.cwd(), filePath);
    return new PrismaBetterSqlite3({ url: `file:${resolvedPath}` });
  }

  const authToken =
    process.env.DATABASE_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  return new PrismaLibSql({ url, authToken });
};
