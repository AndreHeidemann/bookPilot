import "server-only";

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
};

const maybeNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for env var: ${value}`);
  }
  return parsed;
};

export const appConfig = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  sessionPassword: required(process.env.SESSION_PASSWORD, "SESSION_PASSWORD"),
  encryptionKey: required(process.env.ENCRYPTION_KEY, "ENCRYPTION_KEY"),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePriceId: process.env.STRIPE_PRICE_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
  depositAmountCents: maybeNumber(process.env.DEPOSIT_AMOUNT_CENTS, 5000),
  pendingPaymentTtlMinutes: maybeNumber(process.env.PENDING_PAYMENT_TTL_MINUTES, 15),
};
