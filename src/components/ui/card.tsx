import clsx from "clsx";

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>{children}</div>
);
