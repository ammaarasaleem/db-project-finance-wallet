import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TypeBadge, StatusBadge } from "@/components/StatusBadge";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Handshake, Receipt, PiggyBank } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ["wallet-summary"], queryFn: api.wallet.getSummary });
  const { data: overview } = useQuery({ queryKey: ["finance-overview"], queryFn: api.finance.getOverview });
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", "dashboard"],
    queryFn: () => api.wallet.getTransactions({ limit: 5, offset: 0 }),
  });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: api.loans.getAll });
  const { data: bills = [] } = useQuery({ queryKey: ["bills"], queryFn: api.bills.getAll });
  const { data: vaults = [] } = useQuery({ queryKey: ["vaults"], queryFn: api.vaults.getAll });

  const walletBalance = toNumber(summary?.wallet?.balance);
  const monthlySalary = toNumber(summary?.salary?.amount || overview?.salary?.amount);
  const totalFixedExpenses = toNumber(overview?.total_expenses || summary?.monthly_expenses);
  const disposable = toNumber(overview?.disposable_income ?? monthlySalary - totalFixedExpenses);
  const activeLoansCount = loans.filter((loan) => loan.status === "active").length;
  const pendingSplits = bills.filter((bill) => !bill.is_paid).length;
  const activeSavings = vaults.filter((vault) => !vault.isAchieved).length;

  const stats = [
    { title: "Wallet Balance", value: formatCurrency(walletBalance), icon: Wallet, accent: true },
    { title: "Monthly Salary", value: formatCurrency(monthlySalary), icon: TrendingUp },
    { title: "Fixed Expenses", value: formatCurrency(totalFixedExpenses), icon: TrendingDown },
    { title: "Disposable Income", value: formatCurrency(disposable), icon: DollarSign },
    { title: "Active Loans", value: activeLoansCount.toString(), icon: Handshake },
    { title: "Pending Splits", value: pendingSplits.toString(), icon: Receipt },
    { title: "Saving Vaults", value: activeSavings.toString(), icon: PiggyBank },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your finances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`card-shadow transition-shadow hover:card-shadow-hover ${stat.accent ? 'bg-primary text-primary-foreground' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${stat.accent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.accent ? '' : 'text-foreground'}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-foreground">Budget Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Salary</span><span className="font-semibold">{formatCurrency(monthlySalary)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Fixed Expenses</span><span className="font-semibold">{formatCurrency(totalFixedExpenses)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Disposable Income</span><span className="font-semibold">{formatCurrency(disposable)}</span></div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.transaction_id}>
                  <TableCell className="font-medium">{tx.sender}</TableCell>
                  <TableCell>{tx.receiver}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(toNumber(tx.amount))}</TableCell>
                  <TableCell><TypeBadge type={tx.type} /></TableCell>
                  <TableCell><StatusBadge status={tx.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
