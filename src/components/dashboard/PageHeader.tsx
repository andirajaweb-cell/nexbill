/**
 * Shared branded page header — gradient GameMaster title + muted subtitle, used at the top of
 * every /dashboard/** page for consistent look. `actions` renders on the right (buttons/toggles
 * that used to sit next to the old plain <h1>), so no page loses its existing controls.
 */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
