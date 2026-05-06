import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trophy, AlertTriangle, Vault, Coins } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CashParticles, CoinShower } from "@/components/CashParticles";

export default function SavingVaultsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [depositVaultId, setDepositVaultId] = useState<number | null>(null);
  const [vaultName, setVaultName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [showerTrigger, setShowerTrigger] = useState(0);
  const queryClient = useQueryClient();

  const { data: vaults = [] } = useQuery({ queryKey: ["vaults"], queryFn: api.vaults.getAll });

  const createMutation = useMutation({
    mutationFn: api.vaults.create,
    onSuccess: async () => {
      toast.success("Vault created");
      setCreateOpen(false);
      setVaultName(""); setTargetAmount(""); setDeadline("");
      await queryClient.invalidateQueries({ queryKey: ["vaults"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => api.vaults.deposit(id, amount),
    onSuccess: async () => {
      toast.success("Deposit successful");
      setShowerTrigger(Date.now());
      setDepositVaultId(null);
      setDepositAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vaults"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Deposit failed"),
  });

  const today = new Date();

  return (
    <div className="space-y-6 relative">
      <CoinShower trigger={showerTrigger} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Saving Vaults</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and grow your savings goals</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Vault</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Saving Vault</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ vault_name: vaultName, targetAmount: Number(targetAmount), deadline: deadline || undefined });
              }}
              className="space-y-4"
            >
              <div><Label>Vault Name</Label><Input value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="e.g. Vacation Fund" required /></div>
              <div><Label>Target Amount</Label><Input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" placeholder="0.00" min="1" step="any" required /></div>
              <div><Label>Deadline (optional)</Label><Input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Vault"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {vaults.length === 0 && (
        <div className="glass-secondary rounded-xl p-10 text-center">
          <Vault className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40 animate-coin-bounce" />
          <p className="font-display font-semibold text-foreground mb-1">No vaults yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first savings goal to start tracking progress.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Vault</Button>
        </div>
      )}

      {/* Vault cards */}
      <StaggerList delayMs={50} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vaults.map((vault) => {
          const saved = toNumber(vault.savedAmount);
          const target = toNumber(vault.targetAmount);
          const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
          const achieved = Boolean(vault.isAchieved) || saved >= target;
          const overdue = !achieved && vault.deadline && new Date(vault.deadline) < today;
          const circumference = 2 * Math.PI * 32;
          const offset = circumference - (progress / 100) * circumference;

          return (
            <GlassCard liftOnHover key={vault.id} className="p-5 flex flex-col gap-4 relative overflow-hidden">
              {achieved && <CashParticles count={6} type="coins" className="opacity-40" />}
              {/* Title + badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-foreground">{vault.vault_name}</h3>
                {achieved && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold shrink-0 border border-yellow-200">
                    <Trophy className="h-3 w-3 animate-coin-bounce" />
                    Goal reached!
                    <Coins className="h-3 w-3 animate-coin-flip" />
                  </span>
                )}
                {overdue && !achieved && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral-soft text-coral-DEFAULT text-xs font-medium shrink-0">
                    <AlertTriangle className="h-3 w-3" /> Overdue
                  </span>
                )}
              </div>

              {/* Progress ring + stats */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                    <defs>
                      <linearGradient id={`vault-grad-${vault.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        {achieved ? (
                          <>
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                          </>
                        ) : (
                          <>
                            <stop offset="0%" stopColor="#0ea5e9" />
                            <stop offset="55%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#4edea3" />
                          </>
                        )}
                      </linearGradient>
                    </defs>
                    <circle cx="36" cy="36" r="32" fill="none" stroke="hsl(var(--surface-container-high))" strokeWidth="6" />
                    <circle
                      cx="36" cy="36" r="32" fill="none"
                      stroke={`url(#vault-grad-${vault.id})`}
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeLinecap="round"
                      className="animate-vault-fill"
                      style={{ "--circumference": circumference, "--offset": offset } as React.CSSProperties}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-display font-bold text-foreground">
                    <AnimatedNumber value={Math.round(progress)} isCurrency={false} />%
                  </span>
                </div>
                <div className="space-y-1 text-sm z-10">
                  <div>
                    <p className="label-caps text-muted-foreground">Saved</p>
                    <p className="font-display font-bold text-emerald tabular-nums"><AnimatedNumber value={saved} /></p>
                  </div>
                  <div>
                    <p className="label-caps text-muted-foreground">Target</p>
                    <p className="font-display font-semibold text-foreground tabular-nums">{formatCurrency(target)}</p>
                  </div>
                  {vault.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(vault.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Deposit button */}
              {!achieved && (
                <Dialog
                  open={depositVaultId === vault.id}
                  onOpenChange={(open) => setDepositVaultId(open ? vault.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">Deposit to Vault</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">Deposit to "{vault.vault_name}"</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        depositMutation.mutate({ id: vault.id, amount: Number(depositAmount) });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label>Amount</Label>
                        <Input
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          type="number" placeholder="0.00" min="0.01" step="any" required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Remaining to goal: {formatCurrency(target - saved)}
                        </p>
                      </div>
                      <Button type="submit" className="w-full" disabled={depositMutation.isPending}>
                        {depositMutation.isPending ? "Depositing..." : "Confirm Deposit"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              {/* Streak accent at card bottom */}
              <div className={`absolute bottom-0 left-6 right-6 ${achieved ? "streak-purple" : "streak-teal"}`} />
            </GlassCard>
          );
        })}
      </StaggerList>
    </div>
  );
}
