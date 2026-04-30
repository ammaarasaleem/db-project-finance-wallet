import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

const CATEGORIES = ["Housing", "Utilities", "Subscriptions", "Health", "Insurance", "General"];

const categoryBadge: Record<string, string> = {
  Housing:       "bg-primary/10 text-primary",
  Utilities:     "bg-info/10 text-info-foreground",
  Subscriptions: "bg-violet-100 text-violet-700",
  Health:        "bg-emerald-soft text-emerald",
  Insurance:     "bg-yellow-100 text-yellow-700",
  General:       "bg-surface-container text-muted-foreground",
};

const PIE_COLORS = ["#131b2e","#4edea3","#8b5cf6","#10b981","#f59e0b","#64748b"];

export default function FixedExpensesPage() {
  // Add expense state
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [dueDay, setDueDay] = useState("");
  const [amountError, setAmountError] = useState("");

  // Edit salary state
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryAmt, setSalaryAmt] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryPayDay, setSalaryPayDay] = useState("");
  const [salaryAmtError, setSalaryAmtError] = useState("");
  const [salaryPayDayError, setSalaryPayDayError] = useState("");

  const queryClient = useQueryClient();

  const { data: salary } = useQuery({ queryKey: ["salary"], queryFn: api.finance.getSalary, retry: false });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: api.finance.getExpenses });

  // Salary mutation
  const salaryMutation = useMutation({
    mutationFn: api.finance.setSalary,
    onSuccess: async () => {
      toast.success("Salary saved");
      setSalaryOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["salary"] }),
        queryClient.invalidateQueries({ queryKey: ["finance-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const handleSalaryOpen = () => {
    setSalaryAmt(salary?.amount ? String(salary.amount) : "");
    setSalaryCurrency(salary?.currency || "USD");
    setSalaryPayDay(salary?.pay_day ? String(salary.pay_day) : "");
    setSalaryAmtError(""); setSalaryPayDayError("");
    setSalaryOpen(true);
  };

  const handleSalarySave = (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryAmtError(""); setSalaryPayDayError("");
    const parsed = parseFloat(salaryAmt);
    const parsedDay = parseInt(salaryPayDay, 10);
    let valid = true;
    if (!salaryAmt || isNaN(parsed) || parsed <= 0) { setSalaryAmtError("Enter a valid salary amount greater than zero."); valid = false; }
    if (!salaryPayDay || isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) { setSalaryPayDayError("Pay day must be between 1 and 31."); valid = false; }
    if (!valid) return;
    salaryMutation.mutate({ amount: parsed, currency: salaryCurrency, pay_day: parsedDay });
  };

  // Add expense mutation
  const addMutation = useMutation({
    mutationFn: api.finance.addExpense,
    onSuccess: async () => {
      toast.success("Expense added");
      setAddOpen(false);
      setTitle(""); setAmount(""); setCategory("General"); setDueDay(""); setAmountError("");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Add failed"),
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError("");
    const parsedAmt = parseFloat(amount);
    if (!amount || isNaN(parsedAmt) || parsedAmt <= 0) { setAmountError("Please enter a valid amount greater than zero."); return; }
    addMutation.mutate({ title, amount: parsedAmt, category, due_day: Number(dueDay) });
  };

  // Toggle active mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<{ title: string; amount: number; category: string; due_day: number; is_active: boolean }> }) =>
      api.finance.updateExpense(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  // Derived
  const active = fixedExpenses.filter((e) => e.is_active);
  const totalExpenses = active.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const salaryNum = toNumber(salary?.amount) || 0;
  const disposable = salaryNum - totalExpenses;
  const expenseRatio = salaryNum > 0 ? ((totalExpenses / salaryNum) * 100).toFixed(1) : null;

  const categoryData = Object.entries(
    active.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + toNumber(e.amount); return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Fixed Expenses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage salary and recurring expenses</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Fixed Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Netflix, Rent" required /></div>
              <div>
                <Label>Amount</Label>
                <Input value={amount} onChange={(e) => { setAmount(e.target.value); setAmountError(""); }} type="number" placeholder="e.g. 500 or 99.99" min="0.01" step="any" required />
                {amountError && <p className="text-sm text-destructive mt-1">{amountError}</p>}
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due Day (1–31)</Label><Input value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" min="1" max="31" step="1" placeholder="e.g. 1" required /></div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>{addMutation.isPending ? "Adding..." : "Add Expense"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary row */}
      {salaryNum > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <p className="label-caps text-muted-foreground mb-2">Monthly Salary</p>
            <p className="text-2xl font-display font-bold text-foreground tabular-nums">{formatCurrency(salaryNum)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <p className="label-caps text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-2xl font-display font-bold text-foreground tabular-nums">{formatCurrency(totalExpenses)}</p>
            {expenseRatio && (
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, parseFloat(expenseRatio))}%` }} />
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <div className="flex items-center gap-1 mb-2">
              {disposable >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald" /> : <TrendingDown className="h-3.5 w-3.5 text-coral-DEFAULT" />}
              <p className="label-caps text-muted-foreground">Disposable Income</p>
            </div>
            <p className={`text-2xl font-display font-bold tabular-nums ${disposable >= 0 ? "text-emerald" : "text-coral-DEFAULT"}`}>
              {formatCurrency(disposable)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <p className="label-caps text-muted-foreground mb-2">Expense Ratio</p>
            <p className={`text-2xl font-display font-bold ${expenseRatio && parseFloat(expenseRatio) > 80 ? "text-coral-DEFAULT" : "text-foreground"}`}>
              {expenseRatio ? `${expenseRatio}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">of salary</p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center card-shadow">
          <DollarSign className="h-9 w-9 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-display font-semibold text-foreground mb-1">Set your monthly salary</p>
          <p className="text-sm text-muted-foreground mb-4">Track disposable income and expense ratios in one place.</p>
          <Button variant="outline" onClick={handleSalaryOpen}><Edit2 className="mr-2 h-4 w-4" /> Set Salary</Button>
        </div>
      )}

      {/* Salary card + Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Salary card */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 card-shadow flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-caps text-muted-foreground mb-1">Monthly Salary</p>
              {salary ? (
                <>
                  <p className="text-3xl font-display font-bold text-foreground tabular-nums">{formatCurrency(toNumber(salary.amount))}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pay day: {salary.pay_day} · {salary.currency}</p>
                </>
              ) : (
                <p className="text-2xl font-display font-bold text-muted-foreground">Not set</p>
              )}
            </div>
            <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSalaryOpen}>
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />{salary ? "Edit" : "Set Salary"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{salary ? "Edit Monthly Salary" : "Set Monthly Salary"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSalarySave} className="space-y-4">
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input value={salaryAmt} onChange={(e) => { setSalaryAmt(e.target.value); setSalaryAmtError(""); }} type="number" placeholder="e.g. 3000 or 3500.50" min="0.01" step="any" required />
                    {salaryAmtError && <p className="text-sm text-destructive mt-1">{salaryAmtError}</p>}
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["USD","EUR","GBP","PKR","AED","SAR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pay Day (1–31)</Label>
                    <Input value={salaryPayDay} onChange={(e) => { setSalaryPayDay(e.target.value); setSalaryPayDayError(""); }} type="number" min="1" max="31" step="1" placeholder="e.g. 25" required />
                    {salaryPayDayError && <p className="text-sm text-destructive mt-1">{salaryPayDayError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSalaryOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={salaryMutation.isPending}>{salaryMutation.isPending ? "Saving..." : "Save Salary"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {salary && (
            <p className="text-sm text-muted-foreground">
              Salary is used to calculate your disposable income after fixed expenses.
            </p>
          )}
        </div>

        {/* Pie chart */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-foreground">Expense Breakdown</h3>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <BarChart2 className="h-8 w-8 opacity-30" />
              <span>No active expenses to display</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Expenses table */}
      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Fixed Expenses</h3>
          <span className="text-sm text-muted-foreground">
            Total active: <span className="font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
          </span>
        </div>
        {fixedExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No expenses added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-container-low">
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Title</th>
                  <th className="text-right px-6 py-3 label-caps text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Category</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Due Day</th>
                  <th className="text-left px-6 py-3 label-caps text-muted-foreground">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fixedExpenses.map((exp) => (
                  <tr key={exp.expense_id} className={`hover:bg-surface-container-low transition-colors ${!exp.is_active ? "opacity-50" : ""}`}>
                    <td className="px-6 py-3 font-medium text-foreground">{exp.title}</td>
                    <td className="px-6 py-3 text-right font-display font-semibold tabular-nums text-foreground">{formatCurrency(toNumber(exp.amount))}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadge[exp.category] || categoryBadge.General}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-foreground">{exp.due_day}</td>
                    <td className="px-6 py-3">
                      <Switch
                        checked={Boolean(exp.is_active)}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: exp.expense_id, payload: { title: exp.title, amount: toNumber(exp.amount), category: exp.category, due_day: exp.due_day, is_active: checked } })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
