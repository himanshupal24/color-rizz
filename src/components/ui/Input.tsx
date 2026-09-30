import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: Props) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-slate-600">{label}</span>
      ) : null}
      <input
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-[#2563eb]/30 focus:ring-2",
          error && "border-rose-400",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
