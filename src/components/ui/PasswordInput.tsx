"use client";

// Shared password field with a show/hide (eye icon) toggle — per explicit request ("seluruh
// password bisa dilihat pakai icon mata"), rolled out to every raw <input type="password"> in the
// app (login, daftar/onboarding, reset-password, dashboard settings' change-password form, staff
// creation, the "confirm your password" prompts on Admin/Semua Outlet destructive actions,
// platform-admin login/outlet-creation, and the Tuya integration's secret field).
//
// Deliberately a thin wrapper, not a new design: it accepts the SAME `className` each call site
// already used for its <input> (so every page keeps its own exact visual style — dashboard's
// compact inputCls, the marketing pages' glassmorphism inputClass, etc.) and just adds the toggle
// button + the right-padding room for it, plus swaps type="password"/"text" on an internal
// isVisible state. No wrapperClassName styling opinions beyond `relative` (required for the
// button's absolute positioning) so it drops into any existing layout (grids, flex rows, Field
// wrappers) without fighting it.
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", wrapperClassName = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className={`relative ${wrapperClassName}`}>
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${className} pr-10`}
        />
        <button
          type="button"
          // tabIndex -1 + mousedown-preventDefault: a toggle that steals focus mid-typing (Tab
          // order, or losing the input's focus ring on click) is more annoying than helpful here —
          // this keeps the input itself focused/tabbed through normally.
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          {visible ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
