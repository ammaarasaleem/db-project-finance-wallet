import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { HandCoins, Plus, Handshake, Coins } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CoinShower } from "@/components/CashParticles";

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<"lending" | "borrowing">("lending");
  const [requestOpen, setRequestOpen] = useState(false);
  const [lenderUsername, setLenderUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showerTrigger, setShowerTrigger] = useState(0);
  const queryClient = useQueryClient();

  const { data: me } = useCurrentUser();
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: api.loans.getAll });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  const requestMutation = useMutation({
    mutationFn: api.loans.requestLoan,
    onSuccess: async () => {
      toast.success("Loan requested");
      setRequestOpen(false);
      setLenderUsername(""); setAmount(""); setDueDate("");
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const approveMutation = useMutation({
    mutationFn: api.loans.approve,
    onSuccess: async () => { toast.success("Loan approved"); await queryClient.invalidateQueries({ queryKey: ["loans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: api.loans.reject,
    onSuccess: async () => { toast.success("Loan rejected"); await queryClient.invalidateQueries({ queryKey: ["loans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reject failed"),
  });

  const repayMutation = useMutation({
    mutationFn: ({ loanId, repayAmount }: { loanId: number; repayAmount: number }) => api.loans.repay(loanId, repayAmount),
    onSuccess: async () => { 
      toast.success("Repayment submitted"); 
      setShowerTrigger(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["loans"] }); 
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Repayment failed"),
  });

  const lending = loans.filter((l) => l.lender === me?.username);
  const borrowing = loans.filter((l) => l.borrower === me?.username);
  const list = activeTab === "lending" ? lending : borrowing;

  return (
    <div className="space-y-6 relative">
      <CoinShower trigger={showerTrigger} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Loans</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track lending and borrowing</p>
        </div>
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Request Loan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Request a Loan</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestMutation.mutate({ lender_username: lenderUsername, amount: Number(amount), due_date: dueDate || undefined });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Lender (friend)</Label>
                <Select required value={lenderUsername} onValueChange={setLenderUsername}>
                  <SelectTrigger><SelectValue placeholder="Select friend" /></SelectTrigger>
                  <SelectContent>
                    {friends.map((f) => <SelectItem key={f.friendship_id} value={f.username}>{f.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00" min="1" step="any" required />
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
              </div>
              <Button type="submit" className="w-full" disabled={requestMutation.isPending}>
                {requestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-container-low border border-border rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
        {(["lending", "borrowing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "lending" ? `Lending (${lending.length})` : `Borrowing (${borrowing.length})`}
          </button>
        ))}
      </div>

      {/* Loan cards */}
      {list.length === 0 ? (
        <div className="glass-secondary rounded-xl p-10 text-center">
          <Handshake className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40 animate-coin-bounce" />
          <p className="font-display font-semibold text-foreground mb-1">No loans here</p>
          <p className="text-sm text-muted-foreground">
            {activeTab === "borrowing" ? "Request a loan from a friend to get started." : "Approve a loan request from a friend."}
          </p>
        </div>
      ) : (
        <StaggerList delayMs={40} key={activeTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((loan) => {
            const isBorrower = activeTab === "borrowing";
            const original = toNumber(loan.amount);
            const repaid = toNumber(loan.amount_repaid);
            const remaining = toNumber(loan.remaining);
            const progress = original > 0 ? Math.min(100, (repaid / original) * 100) : 0;

            return (
              <GlassCard liftOnHover key={loan.loan_id} className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-semibold text-foreground text-base">
                      {isBorrower ? loan.lender : loan.borrower}
                    </p>
                    <p className="label-caps text-muted-foreground mt-0.5">
                      Due: {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "No deadline"}
                    </p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-surface-container-low border border-border p-3 text-center">
                    <p className="label-caps text-muted-foreground mb-1">Total</p>
                    <p className="font-display font-bold text-foreground tabular-nums"><AnimatedNumber value={original} /></p>
                  </div>
                  <div className="rounded-lg bg-emerald-soft border border-emerald-DEFAULT/20 p-3 text-center">
                    <p className="label-caps text-muted-foreground mb-1">Repaid</p>
                    <p className="font-display font-bold text-emerald tabular-nums"><AnimatedNumber value={repaid} /></p>
                  </div>
                  <div className="rounded-lg bg-surface-container-low border border-border p-3 text-center">
                    <p className="label-caps text-muted-foreground mb-1">Left</p>
                    <p className="font-display font-bold text-foreground tabular-nums"><AnimatedNumber value={remaining} /></p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className={progress >= 100 ? "progress-gradient-green" : "progress-gradient"} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    {progress >= 100 && (
                      <Coins className="h-3.5 w-3.5 text-amber-500 animate-coin-spin" style={{ perspective: "200px" }} />
                    )}
                    <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% repaid</p>
                  </div>
                </div>

                {isBorrower && loan.status === "active" && (
                  <Button
                    className="w-full"
                    onClick={() => repayMutation.mutate({ loanId: loan.loan_id, repayAmount: remaining })}
                    disabled={repayMutation.isPending}
                  >
                    <HandCoins className="mr-2 h-4 w-4" /> Repay {formatCurrency(remaining)}
                  </Button>
                )}
                {!isBorrower && loan.status === "requested" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => approveMutation.mutate(loan.loan_id)} disabled={approveMutation.isPending}>
                      Approve Loan
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => rejectMutation.mutate(loan.loan_id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
