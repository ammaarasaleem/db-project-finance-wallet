import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

export default function KhataGroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [cycleType, setCycleType] = useState("Monthly");
  const [startDate, setStartDate] = useState("");
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({ queryKey: ["khata-groups"], queryFn: api.khata.getGroups });
  const membersQuery = useQuery({
    queryKey: ["khata-members", expandedGroup],
    queryFn: () => api.khata.getMembers(Number(expandedGroup)),
    enabled: Boolean(expandedGroup),
  });
  const contributionsQuery = useQuery({
    queryKey: ["khata-contributions", expandedGroup],
    queryFn: () => api.khata.getContributions(Number(expandedGroup)),
    enabled: Boolean(expandedGroup),
  });

  const createMutation = useMutation({
    mutationFn: api.khata.create,
    onSuccess: async () => {
      toast.success("Group created");
      setCreateOpen(false);
      setName("");
      setContributionAmount("");
      setCycleType("Monthly");
      setStartDate("");
      await queryClient.invalidateQueries({ queryKey: ["khata-groups"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Create failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Khata Groups</h2>
          <p className="text-sm text-muted-foreground">Rotating savings committees</p>
        </div>
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
                  contributionAmount: Number(contributionAmount),
                  cycleType,
                  startDate,
                });
              }}
              className="space-y-4"
            >
              <div><Label>Group Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Committee" required /></div>
              <div><Label>Contribution Amount</Label><Input value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} type="number" placeholder="500" min="1" required /></div>
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
              <div><Label>Start Date</Label><Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" required /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Group"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <Card key={group.Id} className="card-shadow cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === group.Id ? null : group.Id)}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">{group.Name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{group.CycleType}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Contribution:</span> <span className="font-semibold">{formatCurrency(toNumber(group.ContributionAmount))}</span></div>
                <div><span className="text-muted-foreground">Members:</span> <span className="font-semibold">{group.member_count}</span></div>
                <div><span className="text-muted-foreground">Start:</span> <span className="font-semibold">{new Date(group.StartDate).toLocaleDateString()}</span></div>
              </div>

              {expandedGroup === group.Id && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Members & Turn Order</h4>
                  <div className="space-y-1">
                    {(Array.isArray(membersQuery.data)
                      ? membersQuery.data
                      : membersQuery.data?.members || []
                    ).map((member) => (
                      <div key={`${member.username}-${member.TurnOrder}`} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50 text-sm">
                        <span>{member.username}</span>
                        <span className="text-muted-foreground">Turn #{member.TurnOrder}</span>
                      </div>
                    ))}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Contributions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(contributionsQuery.data || []).map((contribution, index) => (
                        <TableRow key={`${contribution.username}-${index}`}>
                          <TableCell>{contribution.username}</TableCell>
                          <TableCell>{contribution.CycleNumber}</TableCell>
                          <TableCell>{formatCurrency(toNumber(contribution.AmountPaid))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
