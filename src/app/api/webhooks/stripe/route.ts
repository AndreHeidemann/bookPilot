import { NextRequest, NextResponse } from "next/server";

import { toJsonError } from "@/lib/errors";
import { handleStripeWebhook } from "@/server/payments/service";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const rawBody = Buffer.from(arrayBuffer);
    const signature = request.headers.get("stripe-signature");
    await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    const { status, body } = toJsonError(error);
    return NextResponse.json(body, { status });
  }
};
