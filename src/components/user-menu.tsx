"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export const UserMenu = ({ email }: { email: string }) => {
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-left text-sm">
        <p className="font-medium text-slate-900">{email}</p>
        <p className="text-slate-500">Signed in</p>
      </div>
      <Button variant="ghost" loading={pending} onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};
