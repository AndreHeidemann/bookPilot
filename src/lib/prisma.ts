import { PrismaClient } from "@prisma/client";

import { buildPrismaAdapter, type PrismaAdapter } from "./prisma-adapter";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaAdapter: PrismaAdapter | undefined;
}

const adapter = global.prismaAdapter ?? buildPrismaAdapter();

export const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.prismaAdapter = adapter;
}
