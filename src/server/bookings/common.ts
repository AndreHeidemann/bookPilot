import { addMinutes, isAfter } from "date-fns";

import { BookingStatus } from "@prisma/client";

import { appConfig } from "@/lib/config";

export const SLOT_DURATION_MINUTES = 60;

export const pendingExpiresAt = (createdAt: Date) =>
  addMinutes(createdAt, appConfig.pendingPaymentTtlMinutes);

export const isPendingExpired = (booking: { status: BookingStatus; createdAt: Date }) =>
  booking.status === "PENDING_PAYMENT" && isAfter(new Date(), pendingExpiresAt(booking.createdAt));
