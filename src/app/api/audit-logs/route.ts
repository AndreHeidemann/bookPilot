import { handleRoute } from "@/lib/http";
import { getCurrentUser } from "@/server/auth/service";
import { getAuditLogs } from "@/server/audit/service";

export const GET = handleRoute(async () => {
  const user = await getCurrentUser();
  const logs = await getAuditLogs(user.teamId);
  return { logs };
});
