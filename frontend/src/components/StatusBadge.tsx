/* StatusBadge — FinTrack sprite-inspired capsule badges with dot indicators */

const typeConfig: Record<string, { cls: string; dot: string; label: string }> = {
  deposit:        { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400", dot: "bg-emerald-500", label: "Deposit" },
  transfer:       { cls: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",        dot: "bg-blue-500",   label: "Transfer" },
  bill_split:     { cls: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400", dot: "bg-violet-500", label: "Bill Split" },
  loan:           { cls: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400", dot: "bg-indigo-500", label: "Loan" },
  loan_repayment: { cls: "bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400",        dot: "bg-teal-500",   label: "Repayment" },
};

const statusConfig: Record<string, { cls: string; dot: string }> = {
  completed: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  pending:   { cls: "bg-amber-500/10  text-amber-600  border-amber-500/20  dark:text-amber-400",      dot: "bg-amber-400" },
  failed:    { cls: "bg-red-500/10    text-red-600    border-red-500/20    dark:text-red-400",         dot: "bg-red-500" },
  cancelled: { cls: "bg-zinc-500/10  text-zinc-500   border-zinc-500/20",                             dot: "bg-zinc-400" },
  active:    { cls: "bg-blue-500/10  text-blue-600   border-blue-500/20   dark:text-blue-400",        dot: "bg-blue-400 animate-pulse" },
  overdue:   { cls: "bg-red-500/10   text-red-600    border-red-500/20    dark:text-red-400",         dot: "bg-red-500" },
  requested: { cls: "bg-sky-500/10   text-sky-600    border-sky-500/20    dark:text-sky-400",         dot: "bg-sky-400 animate-pulse" },
  accepted:  { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400", dot: "bg-emerald-500" },
  rejected:  { cls: "bg-zinc-500/10  text-zinc-500   border-zinc-500/20",                             dot: "bg-zinc-400" },
  repaid:    { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const capsule = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold tracking-wide";

export function TypeBadge({ type }: { type: string }) {
  const cfg = typeConfig[type];
  if (!cfg) return <span className={`${capsule} bg-zinc-500/10 text-zinc-500 border-zinc-500/20`}>{type.replace("_", " ")}</span>;
  return (
    <span className={`${capsule} ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status];
  if (!cfg) return <span className={`${capsule} bg-zinc-500/10 text-zinc-500 border-zinc-500/20 capitalize`}>{status}</span>;
  return (
    <span className={`${capsule} ${cfg.cls} capitalize`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}
