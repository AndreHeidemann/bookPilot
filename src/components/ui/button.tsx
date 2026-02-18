"use client";

import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-100",
  ghost: "bg-transparent text-slate-900 hover:bg-slate-100 disabled:text-slate-400",
};

export const Button = ({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={clsx(
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
      variantStyles[variant],
      className,
    )}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? "..." : children}
  </button>
);
