import { createHash } from "crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

const hashPayload = (payload: unknown) =>
  createHash("sha256").update(JSON.stringify(payload ?? {}), "utf8").digest("hex");

export const runWithIdempotency = async <T>(
  key: string,
  handler: string,
  payload: unknown,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  const requestHash = hashPayload(payload);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.idempotencyKey.findUnique({ where: { key } });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError("IDEMPOTENCY_CONFLICT", "Payload mismatch for idempotency key", 409);
      }
      if (existing.response) {
        return JSON.parse(existing.response) as T;
      }
      throw new AppError("IDEMPOTENCY_BUSY", "Request for this key is still being processed", 409);
    }

    const result = await fn(tx);

    await tx.idempotencyKey.create({
      data: {
        key,
        handler,
        requestHash,
        response: JSON.stringify(result),
      },
    });

    return result;
  });
};
