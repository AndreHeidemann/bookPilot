import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

const LoginPage = async () => {
  const session = await getSession();
  if (session.userId) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">BookPilot</p>
          <h1 className="text-2xl font-semibold text-slate-900">Team access</h1>
          <p className="text-sm text-slate-500">Use the seeded admin account to explore the ops dashboard.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          Want to share availability with customers?
          <Link href="/book/demo-team" className="ml-1 font-medium text-blue-600">
            View public booking page
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
