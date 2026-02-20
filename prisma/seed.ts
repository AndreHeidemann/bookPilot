import "dotenv/config";

import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "../src/lib/passwords";
import { buildPrismaAdapter } from "../src/lib/prisma-adapter";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
const prisma = new PrismaClient({ adapter: buildPrismaAdapter() });

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
