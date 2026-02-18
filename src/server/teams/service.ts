import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export const getTeamBySlug = async (slug: string | undefined | null) => {
  if (!slug) {
    throw new AppError("TEAM_NOT_FOUND", "Team not found", 404);
  }
  const normalizedSlug = slug.trim().toLowerCase();
  const team = await prisma.team.findUnique({ where: { slug: normalizedSlug } });
  if (!team) {
    throw new AppError("TEAM_NOT_FOUND", "Team not found", 404);
  }
  return team;
};
