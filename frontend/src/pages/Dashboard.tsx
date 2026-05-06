import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Handshake, Receipt, ArrowRight, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CashParticles } from "@/components/CashParticles";

const txIcon: Record<string, string> = {
  transfer: "⇄",
  bill_split: "🍽",
  loan: "🤝",
  loan_repayment: "💸",
  deposit: "↓",
};

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ["wallet-summary"], queryFn: api.wallet.getSummary });
  const { data: overview } = useQuery({ queryKey: ["finance-overview"], queryFn: api.finance.getOverview });
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", "dashboard"],
    queryFn: () => api.wallet.getTransactions({ limit: 6, offset: 0 }),
  });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: api.loans.getAll });
  const { data: bills = [] } = useQuery({ queryKey: ["bills"], queryFn: api.bills.getAll });
  const { data: vaults = [] } = useQuery({ queryKey: ["vaults"], queryFn: api.vaults.getAll });

  const walletBalance = toNumber(summary?.wallet?.balance);
  const monthlySalary = toNumber(summary?.salary?.amount ?? overview?.salary?.amount);
  const totalExpenses = toNumber(overview?.total_expenses ?? summary?.monthly_expenses);
  const disposable = toNumber(overview?.disposable_income ?? monthlySalary - totalExpenses);
  const expenseRatio = monthlySalary > 0 ? Math.min(100, (totalExpenses / monthlySalary) * 100) : 0;
  const activeLoans = loans.filter((l) => l.status === "active").length;
  const pendingSplits = bills.filter((b) => !b.is_paid).length;
  const activeVaults = vaults.filter((v) => !v.isAchieved);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your finances</p>
      </div>

      {/* Hero grid: Balance + Vaults */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Wallet balance card */}
        <GlassCard liftOnHover className="lg:col-span-8 p-6 relative overflow-hidden">
          {/* FinTrack sprite glow orbs */}
          <div className="glow-orb glow-orb-teal w-56 h-56 -top-14 -right-14 opacity-40" />
          <div className="glow-orb glow-orb-blue  w-36 h-36 bottom-4   left-8    opacity-25" />
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-surface-container opacity-50 pointer-events-none" />
          {/* Floating coin decorations */}
          <CashParticles count={8} type="coins" className="opacity-80" />
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div>
              <p className="label-caps text-muted-foreground mb-2">Current Balance</p>
              <p className="text-5xl font-display font-bold text-foreground leading-none">
                <AnimatedNumber value={walletBalance} />
              </p>
              <p className="text-xs text-muted-foreground mt-2">{summary?.wallet?.currency || "USD"}</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/wallet"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Wallet className="h-4 w-4" /> Add Funds
              </Link>
              <Link
                to="/wallet"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-foreground text-sm font-semibold border border-border hover:bg-surface-container-high transition-colors"
              >
                <ArrowRight className="h-4 w-4" /> Send Money
              </Link>
            </div>
          </div>
          {/* FinTrack sprite bottom streak accent */}
          <div className="streak-teal absolute bottom-0 left-6 right-6 z-10" />
        </GlassCard>

        {/* Top Saving Vaults */}
        <GlassCard liftOnHover className="lg:col-span-4 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground text-base">Saving Vaults</h3>
            <Link to="/saving-vaults" className="label-caps text-primary hover:opacity-70 transition-opacity">
              View All
            </Link>
          </div>
          <div className="flex-1 space-y-4">
            {activeVaults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No active vaults yet.</p>
            )}
            {activeVaults.slice(0, 3).map((vault) => (
              <div key={vault.id} className="flex items-center gap-3">
                <div className="relative w-11 h-11 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container-high"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="100, 100"
                      strokeWidth="3"
                    />
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${Math.round(vault.progress_percent)}, 100`}
                      strokeWidth="3"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: "9px", fontWeight: 700 }}>
                    {Math.round(vault.progress_percent)}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{vault.vault_name}</p>
                    {vault.progress_percent >= 80 && (
                      <Coins
                        className="h-3.5 w-3.5 text-amber-500 shrink-0"
                        style={{ animation: "coin-flip 2.4s ease-in-out infinite" }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <AnimatedNumber value={toNumber(vault.savedAmount)} /> / {formatCurrency(toNumber(vault.targetAmount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Summary cards row */}
      <StaggerList delayMs={80} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Salary */}
        <GlassCard liftOnHover className="p-5">
          <p className="label-caps text-muted-foreground mb-2">Monthly Salary</p>
          <p className="text-2xl font-display font-bold text-foreground"><AnimatedNumber value={monthlySalary} /></p>
        </GlassCard>

        {/* Expenses with progress bar */}
        <GlassCard liftOnHover className="p-5 flex flex-col gap-2">
          <p className="label-caps text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-display font-bold text-foreground"><AnimatedNumber value={totalExpenses} /></p>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="progress-gradient-purple" style={{ width: `${expenseRatio}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{expenseRatio.toFixed(0)}% of salary</p>
        </GlassCard>

        {/* Disposable income */}
        <GlassCard liftOnHover className="p-5">
          <p className="label-caps text-muted-foreground mb-2">Disposable Income</p>
          <p className={`text-2xl font-display font-bold ${disposable >= 0 ? "text-emerald" : "text-coral-DEFAULT"}`}>
            {disposable >= 0 ? "" : "-"}<AnimatedNumber value={Math.abs(disposable)} />
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${disposable >= 0 ? "text-emerald" : "text-coral-DEFAULT"}`}>
            {disposable >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {disposable >= 0 ? "Surplus" : "Deficit"} this month
          </p>
        </GlassCard>

        {/* Activity pills */}
        <GlassCard liftOnHover className="p-5">
          <p className="label-caps text-muted-foreground mb-3">Activity</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-foreground">{activeLoans} active loan{activeLoans !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-foreground">{pendingSplits} pending split{pendingSplits !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </GlassCard>
      </StaggerList>

      {/* Recent Transactions */}
      <GlassCard className="p-0 overflow-hidden border-none shadow-none sm:border-solid sm:shadow-md">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Recent Transactions</h3>
          <Link to="/transactions" className="label-caps text-primary hover:opacity-70 transition-opacity">
            See All
          </Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No transactions yet.</p>
        ) : (
          <StaggerList delayMs={30} className="divide-y divide-border flex flex-col space-y-0">
            {transactions.map((tx) => {
              const isIncome = tx.type === "deposit" || tx.type === "loan";
              return (
                <div
                  key={tx.transaction_id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-base shrink-0">
                      {txIcon[tx.type] ?? "•"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {tx.type === "transfer"
                          ? `${tx.sender} → ${tx.receiver}`
                          : tx.type === "deposit"
                          ? "Deposit"
                          : tx.type === "bill_split"
                          ? "Bill Split"
                          : tx.type === "loan"
                          ? "Loan"
                          : "Repayment"}
                      </p>
                      <p className="label-caps text-muted-foreground mt-0.5">
                        {tx.note || tx.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold font-display tabular-nums ${isIncome ? "text-emerald" : "text-foreground"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(toNumber(tx.amount))}
                    </p>
                    <p className="label-caps text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </StaggerList>
        )}
      </GlassCard>
    </div>
  );
}
