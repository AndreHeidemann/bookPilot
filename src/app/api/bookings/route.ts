import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute } from "@/lib/http";
import { getCurrentUser } from "@/server/auth/service";
import { listTeamBookings } from "@/server/bookings/service";

const statusSchema = z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED"]);

export const GET = handleRoute(async (request: NextRequest) => {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const query = searchParams.get("q") ?? undefined;
  const filters = {
    status: statusParam ? statusSchema.parse(statusParam) : undefined,
    query,
  };
  const bookings = await listTeamBookings(user.teamId, filters);
  return { bookings };
});
