"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/bookings", label: "Bookings" },
  { href: "/app/availability", label: "Availability" },
  { href: "/app/audit", label: "Audit log" },
];

export const AppNav = () => {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "rounded-md px-3 py-2 text-sm font-medium transition",
              isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
