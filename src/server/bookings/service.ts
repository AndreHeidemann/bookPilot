import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";

import { BookingStatus, Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { encryptValue, decryptValue } from "@/lib/crypto";
import { appConfig } from "@/lib/config";

import { logAudit } from "../audit/service";
import { createCalendarEvent } from "../integrations/google-calendar/client";
import { SLOT_DURATION_MINUTES, isPendingExpired } from "./common";

const pendingCutoffDate = () => addMinutes(new Date(), appConfig.pendingPaymentTtlMinutes * -1);

const bookingSelect = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  customerName: true,
  customerEmailEncrypted: true,
  emailIv: true,
  customerPhoneEncrypted: true,
  phoneIv: true,
  teamId: true,
  createdAt: true,
  confirmedAt: true,
  cancelledAt: true,
  payment: true,
  calendar: true,
} satisfies Prisma.BookingSelect;

export const listTeamBookings = async (
  teamId: string,
  filters: { status?: BookingStatus; query?: string } = {},
) => {
  await expirePendingPayments(teamId);
  const where: Prisma.BookingWhereInput = { teamId };
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.query) {
    where.customerName = { contains: filters.query };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: bookingSelect,
  });

  return bookings.map(formatBookingForApp);
};

export const getTeamBooking = async (teamId: string, id: string) => {
  await expirePendingPayments(teamId);
  const booking = await prisma.booking.findFirst({ where: { id, teamId }, select: bookingSelect });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }
  return formatBookingForApp(booking);
};

export const createPublicBooking = async (input: {
  teamId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startAt: Date;
}) => {
  if (isBefore(input.startAt, new Date())) {
    throw new AppError("PAST_SLOT", "Cannot book a past slot", 400);
  }

  const endAt = addMinutes(input.startAt, SLOT_DURATION_MINUTES);

  await ensureSlotMatchesAvailability(input.teamId, input.startAt, endAt);
  await ensureSlotIsAvailable(input.teamId, input.startAt, endAt);

  const emailEncrypted = encryptValue(input.customerEmail.toLowerCase());
  const phoneEncrypted = encryptValue(input.customerPhone);

  const booking = await prisma.booking.create({
    data: {
      teamId: input.teamId,
      customerName: input.customerName,
      customerEmailEncrypted: emailEncrypted.value,
      emailIv: emailEncrypted.iv,
      customerPhoneEncrypted: phoneEncrypted.value,
      phoneIv: phoneEncrypted.iv,
      startAt: input.startAt,
      endAt,
      status: BookingStatus.PENDING_PAYMENT,
    },
    select: bookingSelect,
  });

  await logAudit({
    teamId: input.teamId,
    bookingId: booking.id,
    action: "booking.created_public",
  });

  return formatBookingForApp(booking);
};

export const confirmBooking = async (bookingId: string, actorUserId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: bookingSelect });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new AppError("BOOKING_CANCELLED", "Booking is cancelled", 409);
  }

  if (booking.status === BookingStatus.CONFIRMED) {
    return formatBookingForApp(booking);
  }

  if (isPendingExpired(booking)) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    throw new AppError("BOOKING_EXPIRED", "Deposit window expired", 409);
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
    select: bookingSelect,
  });

  const event = await createCalendarEvent({
    bookingId: updated.id,
    customerName: updated.customerName,
    startAt: updated.startAt,
    endAt: updated.endAt,
  });

  await prisma.calendarLink.upsert({
    where: { bookingId: updated.id },
    create: {
      bookingId: updated.id,
      provider: "google",
      externalEventId: event.eventId,
      externalHtmlLink: event.htmlLink,
    },
    update: {
      externalEventId: event.eventId,
      externalHtmlLink: event.htmlLink,
    },
  });

  await logAudit({
    teamId: updated.teamId,
    bookingId: updated.id,
    actorUserId,
    action: "booking.confirmed",
  });

  return formatBookingForApp(updated);
};

export const cancelBooking = async (bookingId: string, actorUserId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: bookingSelect });
  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.status === BookingStatus.CANCELLED) {
    return formatBookingForApp(booking);
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    },
    select: bookingSelect,
  });

  await logAudit({
    teamId: updated.teamId,
    bookingId: updated.id,
    actorUserId,
    action: "booking.cancelled",
  });

  return formatBookingForApp(updated);
};

export const getUpcomingBookings = async (teamId: string) => {
  await expirePendingPayments(teamId);
  const today = startOfDay(new Date());
  const soon = addDays(today, 7);
  const bookings = await prisma.booking.findMany({
    where: {
      teamId,
      startAt: { gte: today, lte: soon },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
    },
    orderBy: { startAt: "asc" },
    select: bookingSelect,
  });
  return bookings.map(formatBookingForApp);
};

export const getBlockingBookings = async (teamId: string, start: Date, end: Date) => {
  await expirePendingPayments(teamId);
  const bookings = await prisma.booking.findMany({
    where: {
      teamId,
      startAt: { lt: end },
      endAt: { gt: start },
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING_PAYMENT,
          createdAt: { gte: pendingCutoffDate() },
        },
      ],
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      createdAt: true,
    },
  });

  return bookings;
};

const ensureSlotIsAvailable = async (
  teamId: string,
  startAt: Date,
  endAt: Date,
  ignoreBookingId?: string,
) => {
  const overlap = await prisma.booking.findFirst({
    where: {
      teamId,
      id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING_PAYMENT,
          createdAt: { gte: pendingCutoffDate() },
        },
      ],
    },
  });

  if (overlap) {
    throw new AppError("SLOT_TAKEN", "Slot already booked", 409);
  }
};

const expirePendingPayments = async (teamId: string) => {
  const cutoff = pendingCutoffDate();
  await prisma.booking.updateMany({
    where: {
      teamId,
      status: BookingStatus.PENDING_PAYMENT,
      createdAt: { lt: cutoff },
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });
};

const ensureSlotMatchesAvailability = async (teamId: string, startAt: Date, endAt: Date) => {
  const dayOfWeek = startAt.getDay();
  const startTime = dateToTime(startAt);
  const endTime = dateToTime(endAt);

  const block = await prisma.availabilityBlock.findFirst({
    where: {
      teamId,
      dayOfWeek,
      active: true,
      startTime: { lte: startTime },
      endTime: { gte: endTime },
    },
  });

  if (!block) {
    throw new AppError("UNAVAILABLE_SLOT", "Requested slot is not within availability", 400);
  }
};

const formatBookingForApp = (booking: Prisma.BookingGetPayload<{ select: typeof bookingSelect }>) => ({
  id: booking.id,
  status: booking.status,
  startAt: booking.startAt,
  endAt: booking.endAt,
  customerName: booking.customerName,
  customerEmail: decryptValue(booking.customerEmailEncrypted, booking.emailIv),
  customerPhone: decryptValue(booking.customerPhoneEncrypted, booking.phoneIv),
  payment: booking.payment,
  calendar: booking.calendar,
  createdAt: booking.createdAt,
  confirmedAt: booking.confirmedAt,
  cancelledAt: booking.cancelledAt,
  teamId: booking.teamId,
});

const dateToTime = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes()
    .toString()
    .padStart(2, "0")}`;
