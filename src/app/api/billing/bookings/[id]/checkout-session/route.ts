import { NextRequest } from "next/server";

import { handleRoute } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { createDepositCheckoutSession } from "@/server/payments/service";

export const POST = handleRoute(async (request: NextRequest, context) => {
  const params = context.params as { id: string };
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    throw new AppError("MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required", 400);
  }

  const session = await createDepositCheckoutSession({
    bookingId: params.id,
    idempotencyKey,
  });

  return session;
});
