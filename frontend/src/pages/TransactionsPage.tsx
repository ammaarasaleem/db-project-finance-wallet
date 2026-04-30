import { useState } from "react";
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

  const filtered = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Transactions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">View and filter all activity</p>
      </div>

      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">All Transactions</h3>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground hidden md:table-cell">Note</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => setSelected(tx)}
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{tx.sender}</td>
                    <td className="px-6 py-3 text-foreground">{tx.receiver}</td>
                    <td className="px-6 py-3 text-right font-semibold font-display tabular-nums text-foreground">
                      {formatCurrency(toNumber(tx.amount))}
                    </td>
                    <td className="px-6 py-3"><TypeBadge type={tx.type} /></td>
                    <td className="px-6 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-6 py-3 text-muted-foreground max-w-[160px] truncate hidden md:table-cell">{tx.note ?? "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["ID", `#${selected.transaction_id}`],
                  ["Date", new Date(selected.created_at).toLocaleString()],
                  ["Sender", selected.sender],
                  ["Receiver", selected.receiver],
                  ["Amount", formatCurrency(toNumber(selected.amount))],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="label-caps text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-foreground">{val}</p>
                  </div>
                ))}
                <div>
                  <p className="label-caps text-muted-foreground mb-0.5">Type</p>
                  <TypeBadge type={selected.type} />
                </div>
                <div>
                  <p className="label-caps text-muted-foreground mb-0.5">Status</p>
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              {selected.note && (
                <div className="p-3 rounded-lg bg-surface-container-low border border-border text-sm text-foreground">
                  <p className="label-caps text-muted-foreground mb-1">Note</p>
                  {selected.note}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
