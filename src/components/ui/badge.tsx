import clsx from "clsx";

const variants = {
  default: "bg-slate-100 text-slate-900",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

export const Badge = ({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) => (
  <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variants[variant], className)}>
    {children}
  </span>
);
