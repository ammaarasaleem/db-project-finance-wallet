import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TypeBadge, StatusBadge } from "@/components/StatusBadge";
import { Send, Wallet, ArrowDownCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CashParticles, CoinShower } from "@/components/CashParticles";

export default function WalletPage() {
  const [sendOpen, setSendOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositAmountError, setDepositAmountError] = useState("");

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showerTrigger, setShowerTrigger] = useState(0);

  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: api.wallet.get });
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => api.wallet.getTransactions({ limit: 100, offset: 0 }),
  });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  const depositMutation = useMutation({
    mutationFn: ({ amount, note }: { amount: number; note?: string }) => api.wallet.deposit(amount, note),
    onSuccess: (data) => {
      toast.success(`Deposit successful! New balance: ${formatCurrency(toNumber(data?.balance))}`);
      setShowerTrigger(Date.now());
      setDepositOpen(false);
      setDepositAmount("");
      setDepositNote("");
      setDepositAmountError("");
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Deposit failed"),
  });

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositAmountError("");
    const parsed = parseFloat(depositAmount);
    if (!depositAmount || isNaN(parsed)) { setDepositAmountError("Please enter a valid amount."); return; }
    if (parsed <= 0) { setDepositAmountError("Amount must be greater than zero."); return; }
    depositMutation.mutate({ amount: parsed, note: depositNote || undefined });
  };

  const transferMutation = useMutation({
    mutationFn: api.wallet.transfer,
    onSuccess: async () => {
      toast.success("Money sent successfully");
      setShowerTrigger(Date.now());
      setSendOpen(false);
      setRecipient("");
      setSendAmount("");
      setSendNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Transfer failed"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({ receiver_username: recipient, amount: Number(sendAmount), note: sendNote });
  };

  const filtered = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 relative">
      <CoinShower trigger={showerTrigger} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Wallet</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your balance and transfers</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Dialog open={depositOpen} onOpenChange={(o) => { setDepositOpen(o); if (!o) setDepositAmountError(""); }}>
            <DialogTrigger asChild>
              <Button variant="outline"><ArrowDownCircle className="mr-2 h-4 w-4" /> Deposit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Deposit Money</DialogTitle></DialogHeader>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <Label>Amount</Label>
                  <Input value={depositAmount} onChange={(e) => { setDepositAmount(e.target.value); setDepositAmountError(""); }} type="number" placeholder="e.g. 500 or 250.75" min="0.01" step="any" required />
                  {depositAmountError && <p className="text-sm text-destructive mt-1">{depositAmountError}</p>}
                </div>
                <div>
                  <Label>Note (optional)</Label>
                  <Textarea value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder="e.g. Salary, savings top-up..." />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setDepositOpen(false); setDepositAmountError(""); }}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={depositMutation.isPending}>{depositMutation.isPending ? "Depositing..." : "Confirm Deposit"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger asChild>
              <Button><Send className="mr-2 h-4 w-4" /> Send Money</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Send Money</DialogTitle></DialogHeader>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <Label>Recipient</Label>
                  <Select required value={recipient} onValueChange={setRecipient}>
                    <SelectTrigger><SelectValue placeholder="Select friend" /></SelectTrigger>
                    <SelectContent>
                      {friends.map((f) => (
                        <SelectItem key={f.friendship_id} value={f.username}>{f.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} type="number" placeholder="0.00" min="0.01" step="any" required />
                </div>
                <div>
                  <Label>Note</Label>
                  <Textarea value={sendNote} onChange={(e) => setSendNote(e.target.value)} placeholder="What's this for?" />
                </div>
                <Button type="submit" className="w-full" disabled={transferMutation.isPending}>{transferMutation.isPending ? "Sending..." : "Confirm Transfer"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground rounded-xl p-6 relative overflow-hidden">
        {/* ── FinTrack-sprite glow orbs ── */}
        <div className="glow-orb glow-orb-teal w-48 h-48 -top-12 -right-12 opacity-60" />
        <div className="glow-orb glow-orb-blue  w-32 h-32 bottom-0  right-1/3 opacity-35" />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-20 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
        {/* Animated coin stack */}
        <CashParticles count={6} type="coins" className="opacity-70" />
        <div className="absolute bottom-4 right-5 pointer-events-none opacity-20 animate-coin-bounce">
          <Coins className="h-10 w-10 text-amber-300" />
        </div>
        {/* Small floating coin rings */}
        {([
          { size: 18, right: 52, bottom: 14, delay: "0s",   dur: "3.2s" },
          { size: 14, right: 80, bottom: 28, delay: "1.4s", dur: "4s"   },
          { size: 20, right: 28, bottom: 36, delay: "0.8s", dur: "3.7s" },
        ] as const).map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-amber-300/30 bg-amber-300/10 pointer-events-none"
            style={{
              width: c.size, height: c.size,
              right: c.right, bottom: c.bottom,
              animation: `float-up ${c.dur} ease-in ${c.delay} infinite`,
            }}
          />
        ))}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-primary-foreground/60" />
            <span className="label-caps text-primary-foreground/60">Available Balance</span>
          </div>
          <p className="text-5xl font-display font-bold leading-none"><AnimatedNumber value={toNumber(wallet?.balance)} /></p>
          <p className="text-xs text-primary-foreground/50 mt-2">{wallet?.currency || "USD"}</p>
        </div>
        {/* ── FinTrack-sprite bottom streak accent ── */}
        <div className="streak-teal absolute bottom-0 left-6 right-6" />
      </div>

      <GlassCard className="p-0 overflow-hidden border-none shadow-none sm:border-solid sm:shadow-md">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Transaction History</h3>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="bill_split">Bill Split</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
                <SelectItem value="loan_repayment">Repayment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-container-low">
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Sender</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Receiver</th>
                  <th className="text-right px-6 py-3 label-caps text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Date</th>
                </tr>
              </thead>
              <StaggerList delayMs={30} className="divide-y divide-border table-row-group">
                {filtered.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-surface-container-low transition-colors table-row">
                    <td className="px-6 py-3 font-medium text-foreground">{tx.sender}</td>
                    <td className="px-6 py-3 text-foreground">{tx.receiver}</td>
                    <td className="px-6 py-3 text-right font-semibold font-display tabular-nums text-foreground">{formatCurrency(toNumber(tx.amount))}</td>
                    <td className="px-6 py-3"><TypeBadge type={tx.type} /></td>
                    <td className="px-6 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-3 text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </StaggerList>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
