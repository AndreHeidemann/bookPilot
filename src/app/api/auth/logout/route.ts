import { handleRoute } from "@/lib/http";
import { logout } from "@/server/auth/service";

export const POST = handleRoute(async () => {
  await logout();
  return { success: true };
});
