import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        padding && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "slate",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "slate" | "blue" | "teal" | "amber" | "rose" | "emerald" | "violet";
  icon?: React.ReactNode;
}) {
  const accents = {
    slate: {
      value: "text-slate-900",
      icon: "bg-slate-100 text-slate-600",
      bar: "from-slate-500/20 to-transparent",
    },
    blue: {
      value: "text-blue-700",
      icon: "bg-blue-50 text-blue-600",
      bar: "from-blue-500/20 to-transparent",
    },
    teal: {
      value: "text-teal-700",
      icon: "bg-teal-50 text-teal-600",
      bar: "from-teal-500/20 to-transparent",
    },
    amber: {
      value: "text-amber-700",
      icon: "bg-amber-50 text-amber-600",
      bar: "from-amber-500/20 to-transparent",
    },
    rose: {
      value: "text-rose-700",
      icon: "bg-rose-50 text-rose-600",
      bar: "from-rose-500/20 to-transparent",
    },
    emerald: {
      value: "text-emerald-700",
      icon: "bg-emerald-50 text-emerald-600",
      bar: "from-emerald-500/20 to-transparent",
    },
    violet: {
      value: "text-violet-700",
      icon: "bg-violet-50 text-violet-600",
      bar: "from-violet-500/20 to-transparent",
    },
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b",
          accents.bar,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className={cn("mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl", accents.value)}>
            {value}
          </p>
          {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              accents.icon,
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "blue" | "teal" | "amber" | "rose" | "emerald" | "violet";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-800",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 h-10 w-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-xs text-slate-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

export function AdminTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "bg-slate-50/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={cn("px-4 py-3.5 align-middle text-slate-700", className)} colSpan={colSpan}>
      {children}
    </td>
  );
}

export function MetricTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <p className={cn("mt-0.5 text-lg font-bold text-slate-800", valueClassName)}>{value}</p>
    </div>
  );
}
