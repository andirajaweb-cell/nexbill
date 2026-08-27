"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { __registerDialogListener, DialogState } from "@/lib/ui/dialog";
import { Button } from "./ui/Button";

/**
 * Renders whatever the current showAlert()/showConfirm() call (see lib/ui/dialog.ts) is waiting
 * on, themed to match the rest of the app instead of the browser's native "localhost:3000 says"
 * popup. Mounted once in the root layout so every page gets it automatically — pages never
 * render this directly, they just call showAlert/showConfirm and this reacts.
 */
export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    __registerDialogListener(setState);
    return () => __registerDialogListener(null);
  }, []);

  if (!state) return null;

  const isConfirm = state.kind === "confirm";
  const danger = state.options?.tone === "danger";

  const settle = (result: boolean) => {
    if (state.kind === "confirm") state.resolve(result);
    else state.resolve();
    setState(null);
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => settle(false)}
      role="presentation"
    >
      <div
        className={`w-full max-w-sm rounded-xl border p-5 backdrop-blur-md bg-[#0f1426] shadow-[0_0_30px_rgba(34,211,238,0.18)] ${
          danger ? "border-rose-500/40" : "border-cyan-400/30"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`shrink-0 rounded-lg p-2 ${danger ? "bg-rose-500/15 text-rose-300" : "bg-cyan-500/15 text-cyan-300"}`}>
            {danger ? <AlertTriangle size={18} /> : <Info size={18} />}
          </div>
          <div className="min-w-0 pt-0.5">
            {state.options?.title && <div className="gm-heading font-semibold text-sm mb-1">{state.options.title}</div>}
            <div className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">{state.message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {isConfirm && (
            <Button variant="ghost" onClick={() => settle(false)}>
              {state.options?.cancelLabel ?? "Batal"}
            </Button>
          )}
          <Button variant={danger ? "danger" : "primary"} onClick={() => settle(true)}>
            {isConfirm ? state.options?.confirmLabel ?? "Ya, Lanjutkan" : "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}
