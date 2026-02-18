import { AvailabilityEditor } from "@/components/availability-editor";
import { getCurrentUserOrRedirect } from "@/server/auth/service";
import { listAvailabilityBlocks } from "@/server/availability/service";

const AvailabilityPage = async () => {
  const user = await getCurrentUserOrRedirect();
  const blocks = await listAvailabilityBlocks(user.teamId);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Weekly availability</h1>
        <p className="text-sm text-slate-500">These blocks power the public booking page.</p>
      </div>
      <AvailabilityEditor initialBlocks={blocks} />
    </div>
  );
};

export default AvailabilityPage;
