import { handleRoute } from "@/lib/http";
import { getTeamBySlug } from "@/server/teams/service";
import { getPublicAvailability } from "@/server/availability/service";

export const dynamic = "force-dynamic";

export const GET = handleRoute(async (_request, context) => {
  const params = context.params as { slug: string };
  const team = await getTeamBySlug(params.slug);
  const days = await getPublicAvailability(team.id);
  return { team: { id: team.id, name: team.name, slug: team.slug }, days };
});
