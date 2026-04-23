import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TypeBadge, StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

type WalletTransaction = {
  transaction_id: number;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
  sender: string;
  receiver: string;
};

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", "all"],
    queryFn: () => api.wallet.getTransactions({ limit: 200, offset: 0 }),
  });

  const filtered = transactions.filter(tx => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
        <p className="text-sm text-muted-foreground">View and filter all transactions</p>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-foreground">All Transactions</CardTitle>
            <div className="flex gap-2 flex-wrap">
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
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.transaction_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(tx)}>
                  <TableCell className="text-xs text-muted-foreground">{tx.transaction_id}</TableCell>
                  <TableCell className="font-medium">{tx.sender}</TableCell>
                  <TableCell>{tx.receiver}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(toNumber(tx.amount))}</TableCell>
                  <TableCell><TypeBadge type={tx.type} /></TableCell>
                  <TableCell><StatusBadge status={tx.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{tx.note}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{selected.transaction_id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selected.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Sender:</span> {selected.sender}</div>
                <div><span className="text-muted-foreground">Receiver:</span> {selected.receiver}</div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold">{formatCurrency(toNumber(selected.amount))}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Type:</span> <TypeBadge type={selected.type} /></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status} /></div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Note:</span> {selected.note}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
