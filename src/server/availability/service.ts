import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { canEditAvailability } from "@/lib/rbac";

import { logAudit } from "../audit/service";
import { getBlockingBookings } from "../bookings/service";
import { SLOT_DURATION_MINUTES } from "../bookings/common";

interface AvailabilityInput {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

const timeRegex = /^\d{2}:\d{2}$/;

export const listAvailabilityBlocks = (teamId: string) =>
  prisma.availabilityBlock.findMany({
    where: { teamId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

export const upsertAvailability = async (params: {
  teamId: string;
  role: string;
  actorUserId: string;
  blocks: AvailabilityInput[];
}) => {
  if (!canEditAvailability(params.role as never)) {
    throw new AppError("FORBIDDEN", "Insufficient role to edit availability", 403);
  }

  const normalized = params.blocks.map((block) => validateBlock(block));

  await prisma.$transaction(async (tx) => {
    const keepIds = normalized.filter((b) => b.id).map((b) => b.id!) as string[];
    if (keepIds.length > 0) {
      await tx.availabilityBlock.deleteMany({
        where: {
          teamId: params.teamId,
          id: { notIn: keepIds },
        },
      });
    } else {
      await tx.availabilityBlock.deleteMany({ where: { teamId: params.teamId } });
    }

    await Promise.all(
      normalized.map((block) => {
        const { id, ...rest } = block;
        if (id) {
          return tx.availabilityBlock.update({
            where: { id },
            data: rest,
          });
        }
        return tx.availabilityBlock.create({ data: { ...rest, teamId: params.teamId } });
      }),
    );

    await logAudit(
      {
        teamId: params.teamId,
        actorUserId: params.actorUserId,
        action: "availability.updated",
        details: { count: normalized.length },
      },
      tx,
    );
  });
};

export const getPublicAvailability = async (teamId: string) => {
  const start = startOfDay(new Date());
  const end = addDays(start, 14);
  const blocks = await prisma.availabilityBlock.findMany({
    where: { teamId, active: true },
  });
  const blockingBookings = await getBlockingBookings(teamId, start, end);

  const days: { date: string; slots: string[] }[] = [];

  for (let pointer = new Date(start); pointer < end; pointer = addDays(pointer, 1)) {
    const slots: string[] = [];
    const dayOfWeek = pointer.getDay();
    const dayBlocks = blocks.filter((b) => b.dayOfWeek === dayOfWeek);

    for (const block of dayBlocks) {
      const blockSlots = buildSlotsForBlock(pointer, block);
      for (const slotStart of blockSlots) {
        if (isBefore(slotStart, new Date())) {
          continue;
        }
        const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES);
        if (hasOverlap(slotStart, slotEnd, blockingBookings)) {
          continue;
        }
        slots.push(slotStart.toISOString());
      }
    }

    days.push({ date: pointer.toISOString(), slots });
  }

  return days;
};

const buildSlotsForBlock = (date: Date, block: AvailabilityInput) => {
  const [startHour, startMinute] = block.startTime.split(":").map(Number);
  const [endHour, endMinute] = block.endTime.split(":").map(Number);
  const start = new Date(date);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(date);
  end.setHours(endHour, endMinute, 0, 0);
  const slots: Date[] = [];

  for (let cursor = new Date(start); cursor < end; cursor = addMinutes(cursor, SLOT_DURATION_MINUTES)) {
    if (addMinutes(cursor, SLOT_DURATION_MINUTES) > end) {
      break;
    }
    slots.push(new Date(cursor));
  }

  return slots;
};

const hasOverlap = (
  slotStart: Date,
  slotEnd: Date,
  bookings: { startAt: Date; endAt: Date }[],
) => bookings.some((booking) => booking.startAt < slotEnd && booking.endAt > slotStart);

const validateBlock = (block: AvailabilityInput) => {
  if (block.dayOfWeek < 0 || block.dayOfWeek > 6) {
    throw new AppError("INVALID_DAY", "dayOfWeek must be between 0-6", 400);
  }
  if (!timeRegex.test(block.startTime) || !timeRegex.test(block.endTime)) {
    throw new AppError("INVALID_TIME", "Times must be HH:mm", 400);
  }
  if (block.startTime >= block.endTime) {
    throw new AppError("INVALID_RANGE", "startTime must be before endTime", 400);
  }
  return block;
};
