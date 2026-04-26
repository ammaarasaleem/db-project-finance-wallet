import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// ── Utility: calculate current cycle number from start date + cycle type
function getCurrentCycleNumber(startDate: string, cycleType: string): number {
  const start = new Date(startDate);
  const now = new Date();
  if (now < start) return 1;

  if (cycleType === "Weekly") {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - start.getTime()) / msPerWeek) + 1;
  }
  // Monthly: count full calendar months elapsed
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(1, months + 1);
}

export default function KhataGroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [cycleType, setCycleType] = useState("Monthly");
  const [startDate, setStartDate] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useCurrentUser();

  const { data: groups = [] } = useQuery({
    queryKey: ["khata-groups"],
    queryFn: api.khata.getGroups,
  });

  // Fetch members for the expanded group — with cycleNumber for payment status
  const expandedGroupData = groups.find((g) => g.Id === expandedGroup);
  const currentCycle = expandedGroupData
    ? getCurrentCycleNumber(expandedGroupData.StartDate, expandedGroupData.CycleType)
    : 1;

  const membersQuery = useQuery({
    queryKey: ["khata-members", expandedGroup, currentCycle],
    queryFn: () =>
      api.khata.getMembers(Number(expandedGroup), currentCycle),
    enabled: Boolean(expandedGroup),
  });

  const contributionsQuery = useQuery({
    queryKey: ["khata-contributions", expandedGroup],
    queryFn: () => api.khata.getContributions(Number(expandedGroup)),
    enabled: Boolean(expandedGroup),
  });

  // ── Create group mutation — auto-expand the new group on success (BUG #2B)
  const createMutation = useMutation({
    mutationFn: api.khata.create,
    onSuccess: async (data) => {
      toast.success("Khata group created! See the member turn order below.");
      setCreateOpen(false);
      setName("");
      setContributionAmount("");
      setCycleType("Monthly");
      setStartDate("");
      await queryClient.invalidateQueries({ queryKey: ["khata-groups"] });
      // Auto-expand the newly created group so user sees member turn order immediately
      if (data?.groupId) {
        setExpandedGroup(data.groupId);
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Create failed"),
  });

  // ── Pay contribution mutation (BUG #2A / #2C)
  const contributeMutation = useMutation({
    mutationFn: ({ groupId, cycleNumber }: { groupId: number; cycleNumber: number }) =>
      api.khata.contribute(groupId, cycleNumber),
    onSuccess: async (_, variables) => {
      toast.success(`Contribution for cycle ${variables.cycleNumber} recorded!`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["khata-contributions", variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ["khata-members", variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Contribution failed"),
  });

  // Determine which members have already paid for the current cycle
  const membersArr = Array.isArray(membersQuery.data)
    ? membersQuery.data
    : (membersQuery.data as { members?: typeof membersQuery.data & any[] })?.members || [];

  const unpaidArr: Array<{ username: string }> = Array.isArray(membersQuery.data)
    ? []
    : (membersQuery.data as any)?.unpaid_cycle || [];

  const unpaidUsernames = new Set(unpaidArr.map((u) => u.username));
  // If unpaidArr is populated, any member NOT in unpaidArr has paid.
  // If no cycleNumber data returned, treat all as unpaid until we know.
  const getMemberPaidStatus = (username: string): boolean => {
    if (unpaidArr.length === 0) {
      // Check contributions array directly as fallback
      const contributions = contributionsQuery.data || [];
      return contributions.some(
        (c) => c.username === username && c.CycleNumber === currentCycle
      );
    }
    return !unpaidUsernames.has(username);
  };

  const isCurrentUserMember = membersArr.some(
    (m: any) => m.username === currentUser?.username
  );

  const currentUserPaid = currentUser
    ? getMemberPaidStatus(currentUser.username)
    : false;

  const handleToggleExpand = (groupId: number) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Khata Groups</h2>
          <p className="text-sm text-muted-foreground">Rotating savings committees</p>
        </div>

        {/* ── Create Group Dialog ── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Khata Group</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  name,
                  contributionAmount: parseFloat(contributionAmount),
                  cycleType,
                  startDate,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Group Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Committee" required />
              </div>
              <div>
                <Label>Contribution Amount per Cycle</Label>
                <Input
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  type="number"
                  placeholder="e.g. 500"
                  min="1"
                  step="any"
                  required
                />
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
        <p className="text-sm text-muted-foreground text-center py-8">No Khata groups yet. Create one to get started.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const cycle = getCurrentCycleNumber(group.StartDate, group.CycleType);
          const isExpanded = expandedGroup === group.Id;

          return (
            <Card
              key={group.Id}
              className="card-shadow cursor-pointer"
              onClick={() => handleToggleExpand(group.Id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base text-foreground">{group.Name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{group.CycleType} · Cycle #{cycle}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {isExpanded ? "▲ Hide" : "▼ Details"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
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
                    <span className="font-semibold">{formatCurrency(toNumber(group.total_collected))}</span>
                  </div>
                </div>

                {/* ── Expanded Detail Section ── */}
                {isExpanded && (
                  <div
                    className="mt-4 space-y-4"
                    onClick={(e) => e.stopPropagation()} // prevent card toggle when clicking inside
                  >
                    {/* ── BUG #2A: Pay My Contribution button for current user ── */}
                    {isCurrentUserMember && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div>
                          <p className="text-sm font-medium text-foreground">Your contribution – Cycle #{cycle}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(toNumber(group.ContributionAmount))} due</p>
                        </div>
                        {currentUserPaid ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => contributeMutation.mutate({ groupId: group.Id, cycleNumber: cycle })}
                            disabled={contributeMutation.isPending}
                          >
                            {contributeMutation.isPending ? "Processing…" : "Pay Contribution"}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* ── BUG #2B: Members & Turn Order with payment status ── */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Members & Turn Order — Cycle #{cycle} Status
                      </h4>
                      {membersQuery.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading members…</p>
                      ) : membersArr.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No members yet.</p>
                      ) : (
                        <div className="space-y-1">
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
                        </div>
                      )}
                    </div>

                    {/* ── BUG #2C: Contributions history table ── */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Contribution History</h4>
                      {(contributionsQuery.data || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No contributions recorded yet.</p>
                      ) : (
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
                                <TableCell className="font-semibold">{formatCurrency(toNumber(c.AmountPaid))}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {c.PaidOn ? new Date(c.PaidOn).toLocaleDateString() : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
