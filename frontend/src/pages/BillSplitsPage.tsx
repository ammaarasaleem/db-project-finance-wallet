import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Plus, UserPlus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CoinShower } from "@/components/CashParticles";

export default function BillSplitsPage() {
  const [activeTab, setActiveTab] = useState<"splits" | "create">("splits");

  // Create form state
  const [desc, setDesc] = useState("");
  const [total, setTotal] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [showerTrigger, setShowerTrigger] = useState(0);

  const queryClient = useQueryClient();

  const { data: billRows = [] } = useQuery({ queryKey: ["bills"], queryFn: api.bills.getAll });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: api.bills.create,
    onSuccess: async () => {
      toast.success("Bill split created");
      setDesc("");
      setTotal("");
      setParticipants([]);
      setParticipantInput("");
      setActiveTab("splits");
      await queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Create failed";
      toast.error(message);
    },
  });

  const payMutation = useMutation({
    mutationFn: api.bills.pay,
    onSuccess: async () => {
      toast.success("Payment completed");
      setShowerTrigger(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["bills"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Payment failed";
      toast.error(message);
    },
  });

  // ── Participant management ─────────────────────────────────────────────────
  const addParticipant = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    if (participants.includes(trimmed)) {
      toast.error(`${trimmed} is already added`);
      return;
    }
    setParticipants((prev) => [...prev, trimmed]);
    setParticipantInput("");
  };

  const removeParticipant = (username: string) => {
    setParticipants((prev) => prev.filter((p) => p !== username));
  };

  const toggleFriend = (username: string) => {
    if (participants.includes(username)) {
      removeParticipant(username);
    } else {
      setParticipants((prev) => [...prev, username]);
    }
  };

  const splitAmount =
    participants.length > 0 ? parseFloat(total || "0") / (participants.length + 1) : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) { toast.error("Please enter a description"); return; }
    const totalAmount = parseFloat(total);
    if (!total || isNaN(totalAmount) || totalAmount <= 0) { toast.error("Please enter a valid total amount"); return; }
    if (participants.length === 0) { toast.error("Please add at least one participant"); return; }

    const eachShare = totalAmount / (participants.length + 1);
    const participantPayload = participants.map((username) => ({ username, amount_owed: eachShare }));

    createMutation.mutate({
      description: desc.trim(),
      total_amount: totalAmount,
      participants: participantPayload,
    });
  };

  return (
    <div className="space-y-6 relative">
      <CoinShower trigger={showerTrigger} />
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Bill Splits</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Split expenses with friends</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-container-low border border-border rounded-lg p-1 w-full sm:w-fit">
        {(["splits", "create"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "splits" ? "My Splits" : "Create New Split"}
          </button>
        ))}
      </div>

      {/* ── My Splits tab ── */}
      {activeTab === "splits" && (
        <StaggerList delayMs={40} key="splits" className="space-y-4">
          {billRows.length === 0 && (
            <div className="glass-secondary rounded-xl p-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-display font-semibold text-foreground mb-1">No bill splits yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create a split to share expenses with friends.</p>
              <Button onClick={() => setActiveTab("create")} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Create Split
              </Button>
            </div>
          )}

          {billRows.map((row) => (
            <GlassCard liftOnHover key={row.split_id} className="p-5">
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{row.description || "Bill split"}</h3>
                  <p className="label-caps text-muted-foreground mt-0.5">
                    By {row.created_by} · {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xl font-display font-bold text-foreground tabular-nums">
                  <AnimatedNumber value={toNumber(row.total_amount)} />
                </span>
              </div>

              {/* My share row */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-container-low border border-border">
                <span className="text-sm font-medium text-foreground">My share</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold font-display tabular-nums text-foreground">
                    <AnimatedNumber value={toNumber(row.amount_owed)} />
                  </span>
                  {row.is_paid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-soft text-emerald text-xs font-medium">
                      <Check className="h-3 w-3" /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral-soft text-coral-DEFAULT text-xs font-medium">
                      <X className="h-3 w-3" /> Unpaid
                    </span>
                  )}
                </div>
              </div>

              {/* Pay button */}
              {!row.is_paid && (
                <Button
                  className="mt-3 w-full"
                  onClick={() => payMutation.mutate(row.split_id)}
                  disabled={payMutation.isPending}
                >
                  Pay My Share ({formatCurrency(toNumber(row.amount_owed))})
                </Button>
              )}
            </GlassCard>
          ))}
        </StaggerList>
      )}

      {/* ── Create New Split tab ── */}
      {activeTab === "create" && (
        <StaggerList delayMs={30} key="create">
          <GlassCard className="p-6 max-w-lg mx-auto">
            <h3 className="font-display font-semibold text-foreground text-lg mb-5">Create New Split</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Description */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Description</Label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Dinner, trip, groceries…"
                required
              />
            </div>

            {/* Total amount */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Total Amount</Label>
              <Input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="any"
                required
              />
            </div>

            {/* Participants */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">
                Participants <span className="text-muted-foreground font-normal">({participants.length} added)</span>
              </Label>

              {/* Manual username input */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  placeholder="Type a username…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addParticipant(participantInput); }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addParticipant(participantInput)}
                  className="shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Friends quick-select */}
              {friends.length > 0 && (
                <div className="space-y-1 mb-3">
                  <p className="label-caps text-muted-foreground mb-2">Quick-add from friends</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-surface-container-low">
                    {friends.map((f) => (
                      <label
                        key={f.friendship_id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            participants.includes(f.username)
                              ? "bg-primary border-primary"
                              : "border-border bg-card"
                          }`}
                          onClick={() => toggleFriend(f.username)}
                        >
                          {participants.includes(f.username) && (
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-sm text-foreground" onClick={() => toggleFriend(f.username)}>{f.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 && participants.length === 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  No friends yet — type usernames above to add participants manually.
                </p>
              )}

              {/* Participants chips */}
              {participants.length > 0 && (
                <StaggerList delayMs={20} className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p)}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </StaggerList>
              )}
            </div>

            {/* Split preview */}
            {participants.length > 0 && parseFloat(total || "0") > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-container border border-border text-sm">
                <span className="text-muted-foreground">
                  Each person pays <span className="text-foreground font-medium">({participants.length + 1} people)</span>:
                </span>
                <span className="font-display font-bold text-foreground tabular-nums">
                  <AnimatedNumber value={splitAmount} />
                </span>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating…" : "Create Split"}
            </Button>
          </form>
        </GlassCard>
        </StaggerList>
      )}
    </div>
  );
}
