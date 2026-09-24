"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AlertTriangle, Info, PencilLine } from "lucide-react";
import { __registerDialogListener, DialogState } from "@/lib/ui/dialog";
import { Button } from "./ui/Button";

/**
 * Renders whatever the current showAlert()/showConfirm()/showPrompt() call (see lib/ui/dialog.ts)
 * is waiting on, themed to match the rest of the app instead of the browser's native
 * "localhost:3000 says" popup. Mounted once in the root layout so every page gets it
 * automatically — pages never render this directly, they just call the functions and this reacts.
 */
export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);
  const [teks, setTeks] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    __registerDialogListener(setState);
    return () => __registerDialogListener(null);
  }, []);

  // Isian prompt diisi ulang dari defaultValue setiap kali dialog prompt baru dibuka, lalu difokuskan.
  useEffect(() => {
    if (state?.kind === "prompt") {
      setTeks(state.options?.defaultValue ?? "");
      setTimeout(() => (inputRef.current ?? areaRef.current)?.focus(), 0);
    }
  }, [state]);

  if (!state) return null;

  const isConfirm = state.kind === "confirm";
  const isPrompt = state.kind === "prompt";
  const promptOpts = state.kind === "prompt" ? state.options : undefined;
  const danger = state.options?.tone === "danger";
  const wajib = !!promptOpts?.required;
  const multiline = !!promptOpts?.multiline;
  const bolehKirim = !isPrompt || !wajib || teks.trim().length > 0;

  const settle = (result: boolean) => {
    if (state.kind === "confirm") state.resolve(result);
    else if (state.kind === "prompt") state.resolve(result ? teks.trim() : null);
    else state.resolve();
    setState(null);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") settle(false);
    // Enter mengirim pada isian satu baris; pada multi-baris pakai Ctrl/Cmd+Enter.
    if (e.key === "Enter" && bolehKirim && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      settle(true);
    }
  };

  const isianCls = `w-full rounded-lg bg-neutral-900 border px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 ${
    danger ? "border-rose-500/40 focus:ring-rose-500/40" : "border-cyan-400/30 focus:ring-cyan-400/40"
  }`;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => settle(false)}
      role="presentation"
    >
      <div
        className={`w-full ${isPrompt ? "max-w-md" : "max-w-sm"} rounded-xl border p-5 backdrop-blur-md bg-[#0f1426] shadow-[0_0_30px_rgba(34,211,238,0.18)] ${
          danger ? "border-rose-500/40" : "border-cyan-400/30"
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`shrink-0 rounded-lg p-2 ${danger ? "bg-rose-500/15 text-rose-300" : "bg-cyan-500/15 text-cyan-300"}`}>
            {danger ? <AlertTriangle size={18} /> : isPrompt ? <PencilLine size={18} /> : <Info size={18} />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {state.options?.title && <div className="gm-heading font-semibold text-sm mb-1">{state.options.title}</div>}
            <div className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">{state.message}</div>
            {isPrompt && (
              <div className="mt-3">
                {multiline ? (
                  <textarea
                    ref={areaRef}
                    rows={3}
                    className={`${isianCls} resize-y`}
                    placeholder={promptOpts?.placeholder}
                    value={teks}
                    onChange={(e) => setTeks(e.target.value)}
                  />
                ) : (
                  <input
                    ref={inputRef}
                    className={isianCls}
                    placeholder={promptOpts?.placeholder}
                    value={teks}
                    onChange={(e) => setTeks(e.target.value)}
                  />
                )}
                {wajib && !teks.trim() && <div className="mt-1 text-[11px] text-neutral-500">Wajib diisi.</div>}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {(isConfirm || isPrompt) && (
            <Button variant="ghost" onClick={() => settle(false)}>
              {state.options?.cancelLabel ?? "Batal"}
            </Button>
          )}
          <Button variant={danger ? "danger" : "primary"} onClick={() => settle(true)} disabled={!bolehKirim}>
            {isConfirm || isPrompt ? state.options?.confirmLabel ?? (isPrompt ? "Simpan" : "Ya, Lanjutkan") : "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}
