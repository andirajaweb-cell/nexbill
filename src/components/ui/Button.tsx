"use client";
import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-gradient-to-r from-cyan-500 to-blue-500 text-neutral-950 shadow-[0_0_16px_rgba(34,211,238,0.45)] hover:shadow-[0_0_24px_rgba(34,211,238,0.7)] hover:brightness-110",
        variant === "secondary" &&
          "bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10 hover:border-cyan-400/40",
        variant === "danger" &&
          "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_14px_rgba(244,63,94,0.4)] hover:shadow-[0_0_20px_rgba(244,63,94,0.6)]",
        variant === "ghost" && "bg-transparent text-neutral-400 hover:bg-white/5 hover:text-neutral-100",
        className
      )}
      {...props}
    />
  );
}
