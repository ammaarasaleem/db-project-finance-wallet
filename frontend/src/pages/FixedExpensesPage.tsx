import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

const categoryColors: Record<string, string> = {
  Housing: "bg-primary text-primary-foreground",
  Utilities: "bg-info text-info-foreground",
  Subscriptions: "bg-violet-500 text-primary-foreground",
  Health: "bg-success text-success-foreground",
  Insurance: "bg-warning text-warning-foreground",
  General: "bg-muted text-muted-foreground",
};

const pieColors = ["hsl(224, 76%, 48%)", "hsl(199, 89%, 60%)", "hsl(270, 60%, 55%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)"];

export default function FixedExpensesPage() {
  // ── Add Expense dialog
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [dueDay, setDueDay] = useState("");
  const [amountError, setAmountError] = useState("");

  // ── Edit Salary dialog
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryAmt, setSalaryAmt] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryPayDay, setSalaryPayDay] = useState("");
  const [salaryAmtError, setSalaryAmtError] = useState("");
  const [salaryPayDayError, setSalaryPayDayError] = useState("");

  const queryClient = useQueryClient();

  const { data: salary } = useQuery({
    queryKey: ["salary"],
    queryFn: api.finance.getSalary,
    retry: false,
  });
  const { data: fixedExpenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.finance.getExpenses,
  });

  // ── Salary mutation (BUG #4)
  const salaryMutation = useMutation({
    mutationFn: api.finance.setSalary,
    onSuccess: async () => {
      toast.success("Salary saved successfully");
      setSalaryOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["finance-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const handleSalaryOpen = () => {
    setSalaryAmt(salary?.amount ? String(salary.amount) : "");
    setSalaryCurrency(salary?.currency || "USD");
    setSalaryPayDay(salary?.pay_day ? String(salary.pay_day) : "");
    setSalaryAmtError("");
    setSalaryPayDayError("");
    setSalaryOpen(true);
  };

  const handleSalarySave = (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryAmtError("");
    setSalaryPayDayError("");
    const parsed = parseFloat(salaryAmt);
    const parsedDay = parseInt(salaryPayDay, 10);
    let valid = true;
    if (!salaryAmt || isNaN(parsed) || parsed <= 0) {
      setSalaryAmtError("Enter a valid salary amount greater than zero.");
      valid = false;
    }
    if (!salaryPayDay || isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setSalaryPayDayError("Pay day must be between 1 and 31.");
      valid = false;
    }
    if (!valid) return;
    salaryMutation.mutate({ amount: parsed, currency: salaryCurrency, pay_day: parsedDay });
  };

  // ── Add Expense mutation (BUG #3 — use parseFloat not Number so integers pass)
  const addMutation = useMutation({
    mutationFn: api.finance.addExpense,
    onSuccess: async () => {
      toast.success("Expense added");
      setAddOpen(false);
      setTitle("");
      setAmount("");
      setCategory("General");
      setDueDay("");
      setAmountError("");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Add failed"),
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError("");
    const parsedAmt = parseFloat(amount);
    if (!amount || isNaN(parsedAmt) || parsedAmt <= 0) {
      setAmountError("Please enter a valid amount greater than zero.");
      return;
    }
    addMutation.mutate({ title, amount: parsedAmt, category, due_day: Number(dueDay) });
  };

  // ── Toggle expense active
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<{ title: string; amount: number; category: string; due_day: number; is_active: boolean }>;
    }) => api.finance.updateExpense(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  // ── Derived values for summary panel (BUG #5)
  const active = fixedExpenses.filter((e) => e.is_active);
  const totalExpenses = active.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const salaryNum = toNumber(salary?.amount) || 0;
  const disposable = salaryNum - totalExpenses;
  const expenseRatio = salaryNum > 0 ? ((totalExpenses / salaryNum) * 100).toFixed(1) : null;

  const categoryData = Object.entries(
    active.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + toNumber(e.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fixed Expenses</h2>
          <p className="text-sm text-muted-foreground">Manage salary and recurring expenses</p>
        </div>

        {/* Add Expense Dialog */}
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAmountError(""); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Fixed Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rent" required />
              </div>
              <div>
                <Label>Amount</Label>
                {/* BUG #3 FIX: step="any" allows whole numbers AND decimals */}
                <Input
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                  type="number"
                  placeholder="e.g. 500 or 1200.50"
                  min="0.01"
                  step="any"
                  required
                />
                {amountError && <p className="text-sm text-destructive mt-1">{amountError}</p>}
              </div>
              <div>
                <Label>Category</Label>
                <Select required value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {["Housing", "Utilities", "Subscriptions", "Health", "Insurance", "General"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Day of Month (1–31)</Label>
                <Input
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  type="number" min="1" max="31" step="1"
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding…" : "Add Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Top row: Salary card + Pie chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BUG #4 FIX: Salary card — Edit button is now enabled with full dialog */}
        <Card className="card-shadow bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary-foreground/80">Fixed Monthly Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salaryNum)}</div>
            <p className="text-xs text-primary-foreground/60 mt-1">
              Pay day: {salary?.pay_day ?? "—"} &nbsp;·&nbsp; {salary?.currency ?? "USD"}
            </p>
            <p className="text-xs text-primary-foreground/50 mt-1 italic">
              Used to calculate disposable income after fixed expenses.
            </p>

            {/* Edit / Set Salary Dialog */}
            <Dialog open={salaryOpen} onOpenChange={(o) => { setSalaryOpen(o); if (!o) { setSalaryAmtError(""); setSalaryPayDayError(""); } }}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="mt-3" onClick={handleSalaryOpen}>
                  <Edit2 className="mr-2 h-3 w-3" />{salary ? "Edit Salary" : "Set Salary"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{salary ? "Edit Monthly Salary" : "Set Monthly Salary"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSalarySave} className="space-y-4">
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input
                      value={salaryAmt}
                      onChange={(e) => { setSalaryAmt(e.target.value); setSalaryAmtError(""); }}
                      type="number"
                      placeholder="e.g. 3000 or 3500.50"
                      min="0.01"
                      step="any"
                      required
                    />
                    {salaryAmtError && <p className="text-sm text-destructive mt-1">{salaryAmtError}</p>}
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["USD", "EUR", "GBP", "PKR", "AED", "SAR"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pay Day (1–31)</Label>
                    <Input
                      value={salaryPayDay}
                      onChange={(e) => { setSalaryPayDay(e.target.value); setSalaryPayDayError(""); }}
                      type="number" min="1" max="31" step="1"
                      placeholder="e.g. 25"
                      required
                    />
                    {salaryPayDayError && <p className="text-sm text-destructive mt-1">{salaryPayDayError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSalaryOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={salaryMutation.isPending}>
                      {salaryMutation.isPending ? "Saving…" : "Save Salary"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No active expenses to display.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BUG #5 FIX: Financial Summary Panel ── */}
      {salaryNum > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-shadow">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Salary</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(salaryNum)}</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                {disposable >= 0
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-destructive" />}
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Disposable Income</span>
              </div>
              <p className={`text-xl font-bold ${disposable >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(disposable)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardContent className="pt-5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Expense Ratio</span>
              <p className={`text-xl font-bold mt-1 ${expenseRatio && parseFloat(expenseRatio) > 80 ? "text-destructive" : "text-foreground"}`}>
                {expenseRatio ? `${expenseRatio}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">of salary spent</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="card-shadow border-dashed">
          <CardContent className="py-6 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Set your monthly salary to see your financial health</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Set Salary" on the card above to track disposable income and expense ratios.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Expenses Table ── */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Fixed Expenses</CardTitle>
            <span className="text-sm text-muted-foreground">
              Total active: <span className="font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No expenses added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Day</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedExpenses.map(exp => (
                  <TableRow key={exp.expense_id}>
                    <TableCell className="font-medium">{exp.title}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(toNumber(exp.amount))}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${categoryColors[exp.category] || categoryColors.General}`}>
                        {exp.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{exp.due_day}</TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(exp.is_active)}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: exp.expense_id,
                            payload: {
                              title: exp.title,
                              amount: toNumber(exp.amount),
                              category: exp.category,
                              due_day: exp.due_day,
                              is_active: checked,
                            },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
