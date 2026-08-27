import { clsx } from "clsx";
import { CSSProperties } from "react";

export function Card({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={clsx(
        "rounded-xl border p-4 backdrop-blur-md",
        "border-white/10 bg-[#0f1426]/70",
        "shadow-[0_0_0_1px_rgba(56,189,248,0.04),0_8px_24px_-8px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {children}
    </div>
  );
}
