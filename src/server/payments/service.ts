import { BookingStatus, PaymentStatus } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";
import { decryptValue } from "@/lib/crypto";

import { isPendingExpired } from "../bookings/common";
import { runWithIdempotency } from "../idempotency/service";
import { logAudit } from "../audit/service";
import { createCheckoutSession, verifyStripeRequest } from "./stripe";
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
      throw new AppError("BOOKING_EXPIRED", "Booking payment window expired", 409);
    }

    const successUrl = `${appConfig.appBaseUrl}/book/${booking.team.slug}?status=success`;
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
      const session = event.data.object as { client_reference_id?: string; id: string };
      if (!session.client_reference_id) {
        break;
      }

      let confirmedBooking: { id: string; teamId: string; customerName: string; startAt: Date; endAt: Date } | null =
        null;

      await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id: session.client_reference_id } });
        if (!booking || booking.status !== BookingStatus.PENDING_PAYMENT || isPendingExpired(booking)) {
          return;
        }

        await tx.payment.updateMany({
          where: { bookingId: booking.id },
          data: { status: PaymentStatus.SUCCEEDED },
        });

        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
        });

        confirmedBooking = {
          id: updated.id,
          teamId: updated.teamId,
          customerName: updated.customerName,
          startAt: updated.startAt,
          endAt: updated.endAt,
        };

        await logAudit(
          {
            teamId: booking.teamId,
            bookingId: booking.id,
            action: "booking.confirmed_via_webhook",
          },
          tx,
        );
      });

      if (confirmedBooking) {
        const eventResult = await createCalendarEvent({
          bookingId: confirmedBooking.id,
          customerName: confirmedBooking.customerName,
          startAt: confirmedBooking.startAt,
          endAt: confirmedBooking.endAt,
        });

        await prisma.calendarLink.upsert({
          where: { bookingId: confirmedBooking.id },
          create: {
            bookingId: confirmedBooking.id,
            provider: "google",
            externalEventId: eventResult.eventId,
            externalHtmlLink: eventResult.htmlLink,
          },
          update: {
            externalEventId: eventResult.eventId,
            externalHtmlLink: eventResult.htmlLink,
          },
        });
      }
      break;
    }
    default:
      break;
  }
};
