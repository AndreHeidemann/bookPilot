import { notFound } from "next/navigation";

import { PublicBooking } from "@/components/public-booking";
import { getPublicAvailability } from "@/server/availability/service";
import { getTeamBySlug } from "@/server/teams/service";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const PublicBookingPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams?: Promise<{ status?: string; session_id?: string }>;
}) => {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const normalizedStatus =
    resolvedSearchParams.status === "success"
      ? "success"
      : resolvedSearchParams.status === "cancelled"
        ? "cancelled"
        : undefined;
  const normalizedSessionId =
    typeof resolvedSearchParams.session_id === "string" && resolvedSearchParams.session_id.length > 0
      ? resolvedSearchParams.session_id
      : undefined;
  let team;
  let days;
  try {
    team = await getTeamBySlug(resolvedParams.teamSlug);
    days = await getPublicAvailability(team.id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PublicBooking
          teamName={team.name}
          teamSlug={team.slug}
          days={days}
          initialStatus={normalizedStatus}
          initialSessionId={normalizedSessionId}
        />
      </div>
    </div>
  );
};

export default PublicBookingPage;
