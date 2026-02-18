import { NextRequest } from "next/server";
import { z } from "zod";

import { parseBody, handleRoute } from "@/lib/http";
import { getTeamBySlug } from "@/server/teams/service";
import { createPublicBooking } from "@/server/bookings/service";

const schema = z.object({
  teamSlug: z.string().min(2),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(6),
  startAt: z.string().datetime(),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const body = await parseBody(request, schema);
  const team = await getTeamBySlug(body.teamSlug);
  const booking = await createPublicBooking({
    teamId: team.id,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    startAt: new Date(body.startAt),
  });

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      startAt: booking.startAt,
      endAt: booking.endAt,
    },
  };
});
