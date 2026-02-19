"use client";

import { useState } from "react";
import type { BookingStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";

export const BookingActions = ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => {
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"confirm" | "cancel" | null>(null);

  const perform = async (action: "confirm" | "cancel") => {
    setPendingAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? "Unable to update booking");
        return;
      }
      window.location.reload();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        disabled={status !== "PENDING_PAYMENT"}
        loading={pendingAction === "confirm"}
        onClick={() => perform("confirm")}
      >
        Confirm booking
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        loading={pendingAction === "cancel"}
        onClick={() => perform("cancel")}
      >
        Cancel booking
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};
