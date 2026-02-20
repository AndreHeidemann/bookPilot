import { NextRequest } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { handleRoute, parseBody } from "@/lib/http";
import { confirmBookingFromCheckoutSession } from "@/server/payments/service";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const { sessionId } = await parseBody(request, bodySchema);
  const result = await confirmBookingFromCheckoutSession(sessionId);

  switch (result.status) {
    case "confirmed":
    case "already_confirmed":
      return { status: result.status, bookingId: result.booking.id };
    case "not_found":
      throw new AppError("BOOKING_NOT_FOUND", "No booking found for this checkout session", 404);
    case "expired":
    default:
      throw new AppError(
        "BOOKING_NOT_PENDING",
        "This booking can no longer be confirmed. Please create a new reservation.",
        409,
      );
  }
});
