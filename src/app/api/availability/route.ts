import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute, parseBody } from "@/lib/http";
import { listAvailabilityBlocks, upsertAvailability } from "@/server/availability/service";
import { getCurrentUser } from "@/server/auth/service";

const blockSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  active: z.boolean(),
});

const payloadSchema = z.object({
  blocks: z.array(blockSchema),
});

export const GET = handleRoute(async () => {
  const user = await getCurrentUser();
  const blocks = await listAvailabilityBlocks(user.teamId);
  return { blocks };
});

export const PUT = handleRoute(async (request: NextRequest) => {
  const user = await getCurrentUser();
  const body = await parseBody(request, payloadSchema);
  await upsertAvailability({
    teamId: user.teamId,
    role: user.role,
    actorUserId: user.id,
    blocks: body.blocks,
  });
  const blocks = await listAvailabilityBlocks(user.teamId);
  return { blocks };
});
