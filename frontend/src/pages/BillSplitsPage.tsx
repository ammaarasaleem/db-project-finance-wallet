import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

export default function BillSplitsPage() {
  const [desc, setDesc] = useState("");
  const [total, setTotal] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: billRows = [] } = useQuery({ queryKey: ["bills"], queryFn: api.bills.getAll });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  const createMutation = useMutation({
    mutationFn: api.bills.create,
    onSuccess: async () => {
      toast.success("Bill split created");
      setDesc("");
      setTotal("");
      setSelectedFriends([]);
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
      await queryClient.invalidateQueries({ queryKey: ["bills"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Payment failed";
      toast.error(message);
    },
  });

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const splitAmount = selectedFriends.length > 0 ? parseFloat(total || "0") / (selectedFriends.length + 1) : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !total || selectedFriends.length === 0) {
      toast.error("Please fill all fields and select at least one friend");
      return;
    }

    const totalAmount = Number(total);
    const eachShare = totalAmount / (selectedFriends.length + 1);
    const participants = selectedFriends.map((username) => ({ username, amount_owed: eachShare }));

    createMutation.mutate({
      description: desc,
      total_amount: totalAmount,
      participants,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Bill Splits</h2>
        <p className="text-sm text-muted-foreground">Split expenses with friends</p>
      </div>

      <Tabs defaultValue="splits">
        <TabsList>
          <TabsTrigger value="splits">My Splits</TabsTrigger>
          <TabsTrigger value="create">Create New Split</TabsTrigger>
        </TabsList>

        <TabsContent value="splits" className="space-y-4 mt-4">
          {billRows.map((row) => {
            return (
              <Card key={row.split_id} className="card-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-foreground">{row.description || "Bill split"}</CardTitle>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(toNumber(row.total_amount))}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Created by {row.created_by} • {new Date(row.created_at).toLocaleDateString()}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                    <span className="text-sm font-medium">My share</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(toNumber(row.amount_owed))}</span>
                      {row.is_paid ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  {!row.is_paid && (
                    <Button className="mt-3 w-full" onClick={() => payMutation.mutate(row.split_id)}>
                      Pay My Share
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card className="card-shadow max-w-lg">
            <CardHeader>
              <CardTitle className="text-foreground">Create New Split</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Dinner, trip, etc." required />
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="0.00" min="0.01" step="0.01" required />
                </div>
                <div>
                  <Label>Select Participants</Label>
                  <div className="space-y-2 mt-2">
                    {friends.map((f) => (
                      <label key={f.friendship_id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedFriends.includes(f.username)} onCheckedChange={() => toggleFriend(f.username)} />
                        <span className="text-sm">{f.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedFriends.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="text-muted-foreground">Each person pays:</span>{" "}
                    <span className="font-bold text-foreground">{formatCurrency(splitAmount)}</span>
                    <span className="text-muted-foreground ml-1">({selectedFriends.length + 1} people)</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createMutation.isPending}><Plus className="mr-2 h-4 w-4" />{createMutation.isPending ? "Creating..." : "Create Split"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
