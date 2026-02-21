import { BookingsTable } from "@/components/bookings-table";
import { getCurrentUserOrRedirect } from "@/server/auth/service";
import { listTeamBookings } from "@/server/bookings/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BookingListItem = Awaited<ReturnType<typeof listTeamBookings>>[number];

const BookingsPage = async () => {
  const user = await getCurrentUserOrRedirect();
  const bookings: BookingListItem[] = await listTeamBookings(user.teamId);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-500">Filter by status or search by customer to manage appointments.</p>
      </div>
      <BookingsTable
        initialBookings={bookings.map((booking: BookingListItem) => ({
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          status: booking.status,
          startAt: booking.startAt.toISOString(),
        }))}
      />
    </div>
  );
};

export default BookingsPage;
