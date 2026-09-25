"use client";
import { Loader2 } from "lucide-react";

/**
 * Full-screen "sedang diproses" modal for multi-step actions (e.g. terima pembayaran piutang:
 * create payment → confirm → journal). Blocks the page so the action can't be clicked again
 * mid-flight, and tells the user something is actually happening instead of a silent button.
 * Render it conditionally: `{busy && <ProcessingOverlay message="..." />}`.
 */
export function ProcessingOverlay({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="alertdialog" aria-busy="true" aria-live="polite">
      <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-xl border border-cyan-400/30 bg-[#0f1426] px-6 py-5 text-center shadow-[0_0_24px_rgba(34,211,238,0.25)]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" aria-hidden />
        <div className="text-sm font-medium text-neutral-100">{message}</div>
        {hint && <div className="text-xs text-neutral-500">{hint}</div>}
      </div>
    </div>
  );
}
