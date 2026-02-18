"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookingStatus } from "@prisma/client";

import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BookingItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: BookingStatus;
  startAt: string;
}

const statusFilters: { label: string; value?: BookingStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING_PAYMENT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export const BookingsTable = ({ initialBookings }: { initialBookings: BookingItem[] }) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | undefined>();

  const filtered = useMemo(() => {
    return initialBookings.filter((booking) => {
      const matchesStatus = status ? booking.status === status : true;
      const matchesSearch = booking.customerName.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [initialBookings, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by customer"
          className="max-w-xs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              variant={status === filter.value ? "primary" : "ghost"}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking) => (
              <tr key={booking.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{booking.customerName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(booking.startAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{booking.customerEmail}</div>
                  <div className="text-xs text-slate-400">{booking.customerPhone}</div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/app/bookings/${booking.id}`} className="text-sm font-medium text-blue-600">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="text-center text-sm text-slate-500">No bookings found.</p> : null}
    </div>
  );
};
