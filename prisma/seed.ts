import "dotenv/config";

import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "../src/lib/passwords";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
const rawPath = databaseUrl.startsWith("file:") ? databaseUrl.replace("file:", "") : databaseUrl;
const filePath = rawPath.startsWith("/") ? rawPath : path.resolve(process.cwd(), rawPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${filePath}` });

const prisma = new PrismaClient({ adapter });

async function main() {
  const team = await prisma.team.upsert({
    where: { slug: "demo-team" },
    update: {},
    create: {
      slug: "demo-team",
      name: "Demo Team",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@bookpilot.test" },
    update: {},
    create: {
      email: "admin@bookpilot.test",
      passwordHash: await hashPassword("password123"),
      role: UserRole.ADMIN,
      teamId: team.id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
