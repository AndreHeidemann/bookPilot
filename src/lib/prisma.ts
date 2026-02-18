import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaBetterSqlite3 | undefined;
}

const buildAdapter = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  const filePath = url.startsWith("file:") ? url.replace("file:", "") : url;
  const resolvedPath = filePath.startsWith("/") ? filePath : path.resolve(process.cwd(), filePath);
  return new PrismaBetterSqlite3({ url: `file:${resolvedPath}` });
};

const adapter = global.prismaAdapter ?? buildAdapter();

export const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaAdapter = adapter;
}

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
