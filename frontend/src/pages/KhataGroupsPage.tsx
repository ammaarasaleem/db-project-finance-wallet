import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GlassCard } from "@/components/GlassCard";
import { StaggerList } from "@/components/StaggerList";
import { CoinShower } from "@/components/CashParticles";

// ── Utility: calculate current cycle number from start date + cycle type
function getCurrentCycleNumber(startDate: string, cycleType: string): number {
  const start = new Date(startDate);
  const now   = new Date();
  if (now < start) return 1;

  if (cycleType === "Weekly") {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - start.getTime()) / msPerWeek) + 1;
  }
  // Monthly: count full calendar months elapsed + 1
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth()    - start.getMonth());
  return Math.max(1, months + 1);
}

// ── Sub-component: Add Member form (inline, inside expanded group card)
function AddMemberForm({
  groupId,
  nextTurnOrder,
  onSuccess,
}: {
  groupId: number;
  nextTurnOrder: number;
  onSuccess: () => void;
}) {
  const [username,  setUsername]  = useState("");
  const [turnOrder, setTurnOrder] = useState(String(nextTurnOrder));
  const [error,     setError]     = useState("");

  const addMutation = useMutation({
    mutationFn: (payload: { username: string; turnOrder: number }) =>
      api.khata.addMember(groupId, payload),
    onSuccess: (_, vars) => {
      toast.success(`'${vars.username}' added as turn #${vars.turnOrder}`);
      setUsername("");
      setError("");
      onSuccess();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to add member";
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const to = parseInt(turnOrder, 10);
    if (!username.trim()) { setError("Username is required."); return; }
    if (isNaN(to) || to < 1) { setError("Turn order must be ≥ 1."); return; }
    addMutation.mutate({ username: username.trim(), turnOrder: to });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Label className="text-xs mb-1 block">Username</Label>
          <Input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="Enter username"
            required
          />
        </div>
        <div className="sm:w-28">
          <Label className="text-xs mb-1 block">Turn Order</Label>
          <Input
            value={turnOrder}
            onChange={(e) => { setTurnOrder(e.target.value); setError(""); }}
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 2"
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={addMutation.isPending}>
            <UserPlus className="h-4 w-4 mr-1" />
            {addMutation.isPending ? "Adding…" : "Add Member"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function KhataGroupsPage() {
  // ── Create group dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [name,               setName]               = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [cycleType,          setCycleType]          = useState("Monthly");
  const [startDate,          setStartDate]          = useState("");
  const [createAmtError,     setCreateAmtError]     = useState("");
  const [showerTrigger,      setShowerTrigger]      = useState(0);

  // ── Which group is expanded
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const queryClient  = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // ── All groups the current user belongs to
  const { data: groups = [] } = useQuery({
    queryKey: ["khata-groups"],
    queryFn: api.khata.getGroups,
  });

  // ── For the expanded group — derive cycle number
  const expandedGroupData = groups.find((g) => g.Id === expandedGroup);
  const currentCycle = expandedGroupData
    ? getCurrentCycleNumber(expandedGroupData.StartDate, expandedGroupData.CycleType)
    : 1;

  // ── Members (with paid/unpaid status for current cycle)
  const membersQuery = useQuery({
    queryKey: ["khata-members", expandedGroup, currentCycle],
    queryFn:  () => api.khata.getMembers(Number(expandedGroup), currentCycle),
    enabled:  Boolean(expandedGroup),
  });

  // ── Contribution history
  const contributionsQuery = useQuery({
    queryKey: ["khata-contributions", expandedGroup],
    queryFn:  () => api.khata.getContributions(Number(expandedGroup)),
    enabled:  Boolean(expandedGroup),
  });

  // ── Next available TurnOrder (for "Add Member" form auto-fill)
  const nextTurnOrderQuery = useQuery({
    queryKey: ["khata-next-turn", expandedGroup],
    queryFn:  () => api.khata.getNextTurnOrder(Number(expandedGroup)),
    enabled:  Boolean(expandedGroup),
  });

  // ── Create group
  const createMutation = useMutation({
    mutationFn: api.khata.create,
    onSuccess: async (data) => {
      toast.success("Khata group created! You are turn #1. Add more members below.");
      setCreateOpen(false);
      setName(""); setContributionAmount(""); setCycleType("Monthly"); setStartDate("");
      setCreateAmtError("");
      await queryClient.invalidateQueries({ queryKey: ["khata-groups"] });
      // Auto-expand the new group so creator sees turn order immediately
      if (data?.groupId) setExpandedGroup(data.groupId);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Create failed"),
  });

  // ── Pay contribution
  const contributeMutation = useMutation({
    mutationFn: ({ groupId, cycleNumber }: { groupId: number; cycleNumber: number }) =>
      api.khata.contribute(groupId, cycleNumber),
    onSuccess: async (data, variables) => {
      toast.success(
        `Contribution of $${data?.amountPaid?.toFixed(2) ?? ""} recorded for cycle ${variables.cycleNumber}!`
      );
      setShowerTrigger(Date.now());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["khata-contributions", variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ["khata-members", variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] }),
      ]);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Contribution failed"),
  });

  // ── Derive member arrays from query result
  const membersArr = Array.isArray(membersQuery.data)
    ? membersQuery.data
    : (membersQuery.data as any)?.members || [];

  const unpaidArr: Array<{ username: string }> = Array.isArray(membersQuery.data)
    ? []
    : (membersQuery.data as any)?.unpaid_cycle || [];

  const unpaidUsernames = new Set(unpaidArr.map((u) => u.username));

  const getMemberPaidStatus = (username: string): boolean => {
    // unpaid_cycle = members who have NOT paid; anyone NOT in it has paid
    if (membersQuery.data && !Array.isArray(membersQuery.data)) {
      // We have structured data with unpaid_cycle
      return !unpaidUsernames.has(username);
    }
    // Fallback: check contributions array directly
    return (contributionsQuery.data || []).some(
      (c) => c.username === username && c.CycleNumber === currentCycle
    );
  };

  const isCurrentUserMember = membersArr.some(
    (m: any) => m.username === currentUser?.username
  );
  const currentUserPaid = currentUser
    ? getMemberPaidStatus(currentUser.username)
    : false;

  // ── Is the logged-in user the creator of the expanded group?
  const isCreator = expandedGroupData?.creator === currentUser?.username;

  const nextTurnOrder = nextTurnOrderQuery.data?.nextTurnOrder ?? (membersArr.length + 1);

  const handleToggleExpand = (groupId: number) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  const handleMemberAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["khata-members",    expandedGroup] });
    queryClient.invalidateQueries({ queryKey: ["khata-next-turn",  expandedGroup] });
    queryClient.invalidateQueries({ queryKey: ["khata-groups"] });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAmtError("");
    const parsed = parseFloat(contributionAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setCreateAmtError("Contribution amount must be a positive number.");
      return;
    }
    createMutation.mutate({ name, contributionAmount: parsed, cycleType, startDate });
  };

  return (
    <div className="space-y-6 relative">
      <CoinShower trigger={showerTrigger} />
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Khata Groups</h2>
          <p className="text-sm text-muted-foreground">Rotating savings committees</p>
        </div>

        {/* ── Create Group Dialog ── */}
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateAmtError(""); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Khata Group</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label>Group Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Committee" required />
              </div>
              <div>
                <Label>Contribution Amount per Cycle</Label>
                <Input
                  value={contributionAmount}
                  onChange={(e) => { setContributionAmount(e.target.value); setCreateAmtError(""); }}
                  type="number"
                  placeholder="e.g. 500"
                  min="0.01"
                  step="any"
                  required
                />
                {createAmtError && <p className="text-sm text-destructive mt-1">{createAmtError}</p>}
              </div>
              <div>
                <Label>Cycle Type</Label>
                <Select required value={cycleType} onValueChange={setCycleType}>
                  <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" required />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Group"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No Khata groups yet. Create one to get started.
        </p>
      )}

      {/* ── Group cards ── */}
      <StaggerList delayMs={40} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const cycle     = getCurrentCycleNumber(group.StartDate, group.CycleType);
          const isExpanded = expandedGroup === group.Id;

          return (
            <GlassCard
              liftOnHover={!isExpanded}
              key={group.Id}
              className={`p-0 cursor-pointer transition-all duration-300 ${isExpanded ? "ring-2 ring-primary/20" : ""}`}
              onClick={() => handleToggleExpand(group.Id)}
            >
              {/* ── Card header ── */}
              <div className="p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-display font-semibold text-foreground">{group.Name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {group.CycleType} · Cycle #{cycle} · Creator: {group.creator}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {isExpanded ? "▲ Hide" : "▼ Details"}
                  </Badge>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-3">
                {/* ── Summary row ── */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contribution: </span>
                    <span className="font-semibold">{formatCurrency(toNumber(group.ContributionAmount))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Members: </span>
                    <span className="font-semibold">{group.member_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    <span className="font-semibold">{new Date(group.StartDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Collected: </span>
                    <span className="font-semibold"><AnimatedNumber value={toNumber(group.total_collected)} /></span>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <div
                      className="pt-4 space-y-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                    {/* ── Pay My Contribution ── */}
                    {isCurrentUserMember && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Your contribution — Cycle #{cycle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(toNumber(group.ContributionAmount))} due
                          </p>
                        </div>
                        {currentUserPaid ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              contributeMutation.mutate({ groupId: group.Id, cycleNumber: cycle })
                            }
                            disabled={contributeMutation.isPending}
                          >
                            {contributeMutation.isPending ? "Processing…" : "Pay Contribution"}
                          </Button>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* ── Members & Turn Order ── */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Members &amp; Turn Order — Cycle #{cycle} Status
                      </h4>
                      {membersQuery.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading members…</p>
                      ) : membersArr.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No members yet.</p>
                      ) : (
                        <StaggerList delayMs={20} className="space-y-1">
                          {membersArr.map((member: any) => {
                            const hasPaid = getMemberPaidStatus(member.username);
                            return (
                              <div
                                key={`${member.username}-${member.TurnOrder}`}
                                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    #{member.TurnOrder}
                                  </span>
                                  <span className="font-medium">{member.username}</span>
                                </div>
                                {hasPaid ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                    ✓ Paid
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                                    Unpaid
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </StaggerList>
                      )}
                    </div>

                    {/* ── Add Member form (only visible to group creator) ── */}
                    {isCreator && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                            <UserPlus className="h-4 w-4" /> Add New Member
                          </h4>
                          <AddMemberForm
                            groupId={group.Id}
                            nextTurnOrder={nextTurnOrder}
                            onSuccess={handleMemberAdded}
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* ── Contribution history ── */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Contribution History
                      </h4>
                      {(contributionsQuery.data || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No contributions recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Cycle</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Paid On</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(contributionsQuery.data || []).map((c, i) => (
                                <TableRow key={`${c.username}-${c.CycleNumber}-${i}`}>
                                  <TableCell className="font-medium">{c.username}</TableCell>
                                  <TableCell>#{c.CycleNumber}</TableCell>
                                  <TableCell className="font-semibold">
                                    {formatCurrency(toNumber(c.AmountPaid))}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {c.PaidOn ? new Date(c.PaidOn).toLocaleDateString() : "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </GlassCard>
          );
        })}
      </StaggerList>
    </div>
  );
}
