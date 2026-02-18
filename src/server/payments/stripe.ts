import Stripe from "stripe";

import { appConfig } from "@/lib/config";

let stripeClient: Stripe | null = null;

const getStripe = () => {
  if (!appConfig.stripeSecretKey) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(appConfig.stripeSecretKey, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeClient;
};

export const createCheckoutSession = async (payload: {
  bookingId: string;
  amountCents: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  const stripe = getStripe();
  if (!stripe) {
    return {
      id: `stub_${payload.bookingId}`,
      url: `${payload.successUrl}?mockCheckout=1`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: payload.bookingId,
    metadata: {
      bookingId: payload.bookingId,
    },
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Booking deposit",
          },
          unit_amount: payload.amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: payload.customerEmail,
  });

  return { id: session.id, url: session.url ?? payload.successUrl };
};

export const verifyStripeRequest = (rawBody: Buffer, signature: string | null) => {
  const stripe = getStripe();
  if (!stripe || !appConfig.stripeWebhookSecret) {
    return null;
  }

  if (!signature) {
    return null;
  }

  return stripe.webhooks.constructEvent(rawBody, signature, appConfig.stripeWebhookSecret);
};
