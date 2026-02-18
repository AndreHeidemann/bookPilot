import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute, parseBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/server/auth/service";
import { getTeamBooking, confirmBooking, cancelBooking } from "@/server/bookings/service";
import { canManageBookings } from "@/lib/rbac";

const actionSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

export const GET = handleRoute(async (_request, context) => {
  const user = await getCurrentUser();
  const params = context.params as { id: string };
  const booking = await getTeamBooking(user.teamId, params.id);
  return { booking };
});

export const PATCH = handleRoute(async (request: NextRequest, context) => {
  const user = await getCurrentUser();
  if (!canManageBookings(user.role)) {
    throw new AppError("FORBIDDEN", "Insufficient role", 403);
  }
  const params = context.params as { id: string };
  const body = await parseBody(request, actionSchema);
  const booking =
    body.action === "confirm"
      ? await confirmBooking(params.id, user.id)
      : await cancelBooking(params.id, user.id);
  return { booking };
});
