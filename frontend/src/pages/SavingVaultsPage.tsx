import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(214 32% 91%)" strokeWidth="6" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(224, 76%, 48%)" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 48 48)" className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{percentage.toFixed(0)}%</span>
    </div>
  );
}

export default function SavingVaultsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [depositVault, setDepositVault] = useState<number | null>(null);
  const [vaultName, setVaultName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: savingVaults = [] } = useQuery({ queryKey: ["vaults"], queryFn: api.vaults.getAll });

  const createMutation = useMutation({
    mutationFn: api.vaults.create,
    onSuccess: async () => {
      toast.success("Vault created");
      setCreateOpen(false);
      setVaultName("");
      setTargetAmount("");
      setDeadline("");
      await queryClient.invalidateQueries({ queryKey: ["vaults"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Create failed"),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => api.vaults.deposit(id, amount),
    onSuccess: async () => {
      toast.success("Deposit successful");
      setDepositVault(null);
      setDepositAmount("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vaults"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Deposit failed"),
  });

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Saving Vaults</h2>
          <p className="text-sm text-muted-foreground">Track your savings goals</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Vault</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Saving Vault</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ vault_name: vaultName, targetAmount: Number(targetAmount), deadline: deadline || undefined });
              }}
              className="space-y-4"
            >
              <div><Label>Vault Name</Label><Input value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="e.g. Vacation Fund" required /></div>
              <div><Label>Target Amount</Label><Input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" placeholder="0.00" min="1" required /></div>
              <div><Label>Deadline</Label><Input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Vault"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {savingVaults.map(vault => {
          const percentage = Math.min((toNumber(vault.savedAmount) / toNumber(vault.targetAmount)) * 100, 100);
          const achieved = Boolean(vault.isAchieved) || toNumber(vault.savedAmount) >= toNumber(vault.targetAmount);
          const overdue = !achieved && vault.deadline && new Date(vault.deadline) < today;

          return (
            <Card key={vault.id} className="card-shadow text-center">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">{vault.vault_name}</CardTitle>
                  {achieved && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Trophy className="h-3 w-3 mr-1" />Achieved</Badge>}
                  {overdue && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CircularProgress percentage={percentage} />
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Saved:</span> <span className="font-bold text-foreground">{formatCurrency(toNumber(vault.savedAmount))}</span></div>
                  <div><span className="text-muted-foreground">Target:</span> <span className="font-semibold">{formatCurrency(toNumber(vault.targetAmount))}</span></div>
                  <div className="text-xs text-muted-foreground">Deadline: {vault.deadline ? new Date(vault.deadline).toLocaleDateString() : "-"}</div>
                </div>
                {!achieved && (
                  <>
                    <Dialog open={depositVault === vault.id} onOpenChange={open => setDepositVault(open ? vault.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full">Deposit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Deposit to {vault.vault_name}</DialogTitle></DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            depositMutation.mutate({ id: vault.id, amount: Number(depositAmount) });
                          }}
                          className="space-y-4"
                        >
                          <div><Label>Amount</Label><Input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} type="number" placeholder="0.00" min="0.01" step="0.01" required /></div>
                          <Button type="submit" className="w-full" disabled={depositMutation.isPending}>{depositMutation.isPending ? "Depositing..." : "Confirm Deposit"}</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
