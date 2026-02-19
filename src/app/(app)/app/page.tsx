import { isAfter, isSameDay } from "date-fns";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUserOrRedirect } from "@/server/auth/service";
import { listTeamBookings } from "@/server/bookings/service";

type BookingListItem = Awaited<ReturnType<typeof listTeamBookings>>[number];

const DashboardPage = async () => {
  const user = await getCurrentUserOrRedirect();
  const bookings: BookingListItem[] = await listTeamBookings(user.teamId);
  const today = bookings.filter((booking) => isSameDay(new Date(booking.startAt), new Date()));
  const upcoming = bookings.filter((booking) => isAfter(new Date(booking.startAt), new Date())).slice(0, 5);
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pendingCount = bookings.filter((b) => b.status === "PENDING_PAYMENT").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Card className="flex-1 min-w-[200px]">
          <p className="text-sm text-slate-500">Confirmed bookings</p>
          <p className="text-3xl font-semibold text-slate-900">{confirmedCount}</p>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <p className="text-sm text-slate-500">Pending deposits</p>
          <p className="text-3xl font-semibold text-amber-600">{pendingCount}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Today&apos;s schedule</h2>
        </div>
        {today.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings scheduled today.</p>
        ) : (
          <div className="space-y-3">
            {today.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="font-medium text-slate-900">{booking.customerName}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(booking.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming reservations.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{booking.customerName}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(booking.startAt).toLocaleDateString()} • {new Date(booking.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
