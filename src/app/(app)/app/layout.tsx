import { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUserOrRedirect } from "@/server/auth/service";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUserOrRedirect();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        <aside className="w-64 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
            <p className="text-lg font-semibold text-slate-900">{user.team.name}</p>
            <p className="text-sm text-slate-500">{user.team.slug}</p>
          </div>
          <AppNav />
          <UserMenu email={user.email} />
        </aside>
        <main className="flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
