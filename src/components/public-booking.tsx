"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface PublicBookingProps {
  teamName: string;
  teamSlug: string;
  days: { date: string; slots: string[] }[];
}

export const PublicBooking = ({ teamName, teamSlug, days }: PublicBookingProps) => {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [step, setStep] = useState<"time" | "details" | "confirmation">("time");
  const [status, setStatus] = useState<null | { success: boolean; message: string; checkoutUrl?: string }>(null);
  const [loading, setLoading] = useState(false);

  const filteredSlots = useMemo(() => days.find((day) => day.date === selectedDate)?.slots ?? [], [days, selectedDate]);

  const handleCreate = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setStatus(null);
    try {
      const bookingResponse = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamSlug,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          startAt: selectedSlot,
        }),
      });
      if (!bookingResponse.ok) {
        const data = await bookingResponse.json();
        setStatus({ success: false, message: data.message ?? "Unable to create booking" });
        return;
      }
      const { booking } = await bookingResponse.json();
      const idempotencyKey = crypto.randomUUID();
      const checkoutResponse = await fetch(`/api/billing/bookings/${booking.id}/checkout-session`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      if (!checkoutResponse.ok) {
        const data = await checkoutResponse.json();
        setStatus({ success: false, message: data.message ?? "Unable to initialize payment" });
        return;
      }
      const checkout = await checkoutResponse.json();
      setStatus({
        success: true,
        message: "We saved your reservation. Complete the deposit payment to confirm.",
        checkoutUrl: checkout.url,
      });
      setStep("confirmation");
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
  const formattedTime = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  if (!days.length) {
    return (
      <Card className="text-center text-slate-500">This team hasn&apos;t published availability yet.</Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-blue-600">Book with {teamName}</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {step === "time" && "Choose a time"}
          {step === "details" && "Who&apos;s attending?"}
          {step === "confirmation" && "Confirm your deposit"}
        </h1>
      </div>

      {step === "time" && (
        <div className="grid gap-4 md:grid-cols-[1.2fr,2fr]">
          <Card className="space-y-2">
            {days.map((day) => (
              <button
                key={day.date}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  selectedDate === day.date ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setSelectedDate(day.date);
                  setSelectedSlot(null);
                }}
              >
                <span>{formattedDate(day.date)}</span>
                <span className="text-xs text-slate-500">{day.slots.length} slots</span>
              </button>
            ))}
          </Card>
          <Card className="space-y-3">
            {filteredSlots.length === 0 ? (
              <p className="text-sm text-slate-500">No spots left for this day.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredSlots.map((slot) => (
                  <button
                    key={slot}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      selectedSlot === slot
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-700 hover:border-blue-300"
                    }`}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep("details");
                    }}
                  >
                    {formattedTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {step === "details" && (
        <Card className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Full name</label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Phone</label>
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" type="button" onClick={() => setStep("time")}>Back</Button>
            <Button
              type="button"
              onClick={handleCreate}
              loading={loading}
              disabled={!form.name || !form.email || !form.phone || !selectedSlot}
            >
              Reserve & pay deposit
            </Button>
          </div>
          {status && !status.success ? <p className="text-sm text-red-600">{status.message}</p> : null}
        </Card>
      )}

      {step === "confirmation" && status && (
        <Card className="space-y-4 text-center">
          <p className="text-lg font-semibold text-slate-900">{status.success ? "You&apos;re almost done!" : "Something went wrong"}</p>
          <p className="text-sm text-slate-500">{status.message}</p>
          {status.checkoutUrl ? (
            <a
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              href={status.checkoutUrl}
            >
              Open payment link
            </a>
          ) : null}
          <Button variant="ghost" type="button" onClick={() => window.location.reload()}>
            Book another slot
          </Button>
        </Card>
      )}
    </div>
  );
};
