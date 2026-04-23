import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TypeBadge, StatusBadge } from "@/components/StatusBadge";
import { Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

export default function WalletPage() {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: api.wallet.get });
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () => api.wallet.getTransactions({ limit: 100, offset: 0 }),
  });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  const transferMutation = useMutation({
    mutationFn: api.wallet.transfer,
    onSuccess: async () => {
      toast.success("Money sent successfully");
      setOpen(false);
      setRecipient("");
      setAmount("");
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Transfer failed";
      toast.error(message);
    },
  });

  const filtered = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({
      receiver_username: recipient,
      amount: Number(amount),
      note,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wallet</h2>
          <p className="text-sm text-muted-foreground">Manage your balance and transfers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Send className="mr-2 h-4 w-4" />Send Money</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Money</DialogTitle>
            </DialogHeader>
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
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00" min="0.01" step="0.01" required />
              </div>
              <div>
                <Label>Note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" />
              </div>
              <Button type="submit" className="w-full" disabled={transferMutation.isPending}>{transferMutation.isPending ? "Sending..." : "Confirm Transfer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-6 w-6 text-primary-foreground/70" />
            <span className="text-sm text-primary-foreground/80">Available Balance</span>
          </div>
          <div className="text-4xl font-bold">{formatCurrency(toNumber(wallet?.balance))}</div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-foreground">Transaction History</CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="bill_split">Bill Split</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="loan_repayment">Repayment</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.transaction_id}>
                  <TableCell className="text-xs text-muted-foreground">{tx.transaction_id}</TableCell>
                  <TableCell className="font-medium">{tx.sender}</TableCell>
                  <TableCell>{tx.receiver}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(toNumber(tx.amount))}</TableCell>
                  <TableCell><TypeBadge type={tx.type} /></TableCell>
                  <TableCell><StatusBadge status={tx.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
