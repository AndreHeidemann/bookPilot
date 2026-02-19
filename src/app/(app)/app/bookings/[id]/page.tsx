import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingActions } from "@/components/booking-actions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUserOrRedirect } from "@/server/auth/service";
import { getTeamBooking } from "@/server/bookings/service";
import { getBookingAuditTrail } from "@/server/audit/service";
import { AppError } from "@/lib/errors";

type BookingAuditLogs = Awaited<ReturnType<typeof getBookingAuditTrail>>;
type BookingAuditLog = BookingAuditLogs[number];

const BookingDetailPage = async ({ params }: { params: { id: string } }) => {
  const user = await getCurrentUserOrRedirect();
  try {
    const booking = await getTeamBooking(user.teamId, params.id);
    const logs: BookingAuditLogs = await getBookingAuditTrail(booking.id);
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">Customer</p>
            <p className="text-lg font-semibold text-slate-900">{booking.customerName}</p>
            <p className="text-sm text-slate-600">{booking.customerEmail}</p>
            <p className="text-sm text-slate-600">{booking.customerPhone}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">Schedule</p>
            <p className="text-sm text-slate-900">
              {new Date(booking.startAt).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
            <StatusBadge status={booking.status} />
            {booking.calendar?.externalHtmlLink ? (
              <Link className="text-sm font-medium text-blue-600" href={booking.calendar.externalHtmlLink}>
                View calendar event
              </Link>
            ) : null}
          </Card>
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">Payment</p>
            <p className="text-sm text-slate-900">Deposit status: {booking.payment?.status ?? "Pending"}</p>
          </Card>
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">Audit trail</p>
            <div className="space-y-2 text-sm text-slate-600">
              {logs.length === 0
                ? "No activity yet."
                : logs.map((log: BookingAuditLog) => (
                    <div key={log.id}>
                      <p className="font-medium text-slate-900">{log.action}</p>
                      <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
            </div>
          </Card>
        </div>
        <div>
          <Card className="space-y-3">
            <p className="font-semibold text-slate-900">Workflow</p>
            <BookingActions bookingId={booking.id} status={booking.status} />
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }
    throw error;
  }
};

export default BookingDetailPage;
