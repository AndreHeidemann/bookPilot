import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface AuditLogInput {
  teamId: string;
  action: string;
  actorUserId?: string;
  bookingId?: string;
  details?: Record<string, unknown>;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

const withClient = (client?: DbClient) => client ?? prisma;

export const logAudit = (input: AuditLogInput, client?: DbClient) =>
  withClient(client).auditLog.create({
    data: {
      teamId: input.teamId,
      actorUserId: input.actorUserId,
      bookingId: input.bookingId,
      action: input.action,
      details: input.details as object | undefined,
    },
  });

export const getAuditLogs = (teamId: string, limit = 50) =>
  prisma.auditLog.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
          startAt: true,
        },
      },
    },
  });

export const getBookingAuditTrail = (bookingId: string, limit = 10) =>
  prisma.auditLog.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
