import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  fullWidth,
  ...props
}: Props) {
  const variants = {
    primary: "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-md",
    secondary: "bg-white text-[#2563eb] border border-[#2563eb]/30",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
