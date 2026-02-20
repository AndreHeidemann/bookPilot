import { BookingStatus, PaymentStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";
import { decryptValue } from "@/lib/crypto";

import { isPendingExpired } from "../bookings/common";
import { runWithIdempotency } from "../idempotency/service";
import { logAudit } from "../audit/service";
import { createCheckoutSession, retrieveCheckoutSession, verifyStripeRequest } from "./stripe";
import { createCalendarEvent } from "../integrations/google-calendar/client";

export const createDepositCheckoutSession = async ({
  bookingId,
  idempotencyKey,
}: {
  bookingId: string;
  idempotencyKey: string;
}) => {
  return runWithIdempotency(idempotencyKey, "CreateDepositCheckout", { bookingId }, async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId },
      include: { team: true },
    });
    if (!booking) {
      throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new AppError("BOOKING_NOT_PENDING", "Booking is not awaiting payment", 409);
    }

    if (isPendingExpired(booking)) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      });
      await tx.payment.updateMany({
        where: { bookingId: booking.id },
        data: { status: PaymentStatus.CANCELED },
      });
      throw new AppError("BOOKING_EXPIRED", "Booking payment window expired", 409);
    }

    const successUrl = `${appConfig.appBaseUrl}/book/${booking.team.slug}?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appConfig.appBaseUrl}/book/${booking.team.slug}?status=cancelled`;

    const decryptedEmail = decryptValue(booking.customerEmailEncrypted, booking.emailIv);

    const session = await createCheckoutSession({
      bookingId: booking.id,
      amountCents: appConfig.depositAmountCents,
      customerEmail: decryptedEmail,
      successUrl,
      cancelUrl,
    });

    await tx.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        amountCents: appConfig.depositAmountCents,
        stripeSessionId: session.id,
      },
      update: {
        stripeSessionId: session.id,
        amountCents: appConfig.depositAmountCents,
      },
    });

    await logAudit(
      {
        teamId: booking.teamId,
        bookingId: booking.id,
        action: "payment.checkout_session_created",
      },
      tx,
    );

    return { sessionId: session.id, url: session.url };
  });
};

export const handleStripeWebhook = async (rawBody: Buffer, signature: string | null) => {
  const event = verifyStripeRequest(rawBody, signature);
  if (!event) {
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { client_reference_id?: string };
      if (!session.client_reference_id) {
        break;
      }

      await confirmPaidBooking(session.client_reference_id, "booking.confirmed_via_webhook");
      break;
    }
    default:
      break;
  }
};

type BookingForCalendar = {
  id: string;
  teamId: string;
  customerName: string;
  startAt: Date;
  endAt: Date;
};

export type BookingConfirmationResult =
  | { status: "confirmed"; booking: BookingForCalendar }
  | { status: "already_confirmed"; booking: BookingForCalendar }
  | { status: "not_found" }
  | { status: "expired" };

const confirmPaidBooking = async (
  bookingId: string,
  auditAction: string,
): Promise<BookingConfirmationResult> => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        teamId: true,
        customerName: true,
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
      },
    });

    if (!booking) {
      return { status: "not_found" } as const;
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return {
        status: "already_confirmed",
        booking: {
          id: booking.id,
          teamId: booking.teamId,
          customerName: booking.customerName,
          startAt: booking.startAt,
          endAt: booking.endAt,
        },
      } as const;
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT || isPendingExpired(booking)) {
      return { status: "expired" } as const;
    }

    await tx.payment.updateMany({
      where: { bookingId: booking.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CONFIRMED, confirmedAt: new Date() },
    });

    await logAudit(
      {
        teamId: booking.teamId,
        bookingId: booking.id,
        action: auditAction,
      },
      tx,
    );

    return {
      status: "confirmed",
      booking: {
        id: updated.id,
        teamId: updated.teamId,
        customerName: updated.customerName,
        startAt: updated.startAt,
        endAt: updated.endAt,
      },
    } as const;
  });

  if (result.status === "confirmed") {
    await attachCalendarLink(result.booking);
  }

  return result;
};

const attachCalendarLink = async (booking: BookingForCalendar) => {
  const eventResult = await createCalendarEvent({
    bookingId: booking.id,
    customerName: booking.customerName,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });

  await prisma.calendarLink.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      provider: "google",
      externalEventId: eventResult.eventId,
      externalHtmlLink: eventResult.htmlLink,
    },
    update: {
      externalEventId: eventResult.eventId,
      externalHtmlLink: eventResult.htmlLink,
    },
  });
};

export const confirmBookingFromCheckoutSession = async (
  sessionId: string,
): Promise<BookingConfirmationResult> => {
  const session = await retrieveCheckoutSession(sessionId);
  if (!session) {
    throw new AppError("STRIPE_DISABLED", "Stripe is not configured", 400);
  }

  if (session.payment_status !== "paid") {
    throw new AppError("CHECKOUT_NOT_PAID", "Stripe has not marked this session as paid", 409);
  }

  if (!session.client_reference_id) {
    throw new AppError("CHECKOUT_MISSING_BOOKING", "Checkout session is missing a booking reference", 400);
  }

  return confirmPaidBooking(session.client_reference_id, "booking.confirmed_via_checkout_poll");
};
