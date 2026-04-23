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
import { Plus, Edit2 } from "lucide-react";
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
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [dueDay, setDueDay] = useState("");
  const queryClient = useQueryClient();

  const { data: salary } = useQuery({ queryKey: ["salary"], queryFn: api.finance.getSalary });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: api.finance.getExpenses });

  const addMutation = useMutation({
    mutationFn: api.finance.addExpense,
    onSuccess: async () => {
      toast.success("Expense added");
      setAddOpen(false);
      setTitle("");
      setAmount("");
      setCategory("General");
      setDueDay("");
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Add failed"),
  });

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

  const active = fixedExpenses.filter((expense) => expense.is_active);
  const totalExpenses = active.reduce((sum, expense) => sum + toNumber(expense.amount), 0);

  const categoryData = Object.entries(
    active.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + toNumber(expense.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fixed Expenses</h2>
          <p className="text-sm text-muted-foreground">Manage salary and recurring expenses</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Fixed Expense</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  title,
                  amount: Number(amount),
                  category,
                  due_day: Number(dueDay),
                });
              }}
              className="space-y-4"
            >
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rent" required /></div>
              <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00" min="0.01" required /></div>
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
              <div><Label>Due Day of Month</Label><Input value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" min="1" max="31" required /></div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>{addMutation.isPending ? "Adding..." : "Add Expense"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-shadow bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary-foreground/80">Fixed Monthly Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(toNumber(salary?.amount))}</div>
            <p className="text-xs text-primary-foreground/60 mt-1">Pay day: {salary?.pay_day || "-"}</p>
            <Button variant="secondary" size="sm" className="mt-3" disabled>
              <Edit2 className="mr-2 h-3 w-3" />Edit
            </Button>
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Fixed Expenses</CardTitle>
            <span className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{formatCurrency(totalExpenses)}</span></span>
          </div>
        </CardHeader>
        <CardContent>
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
                    <Badge className={`text-xs ${categoryColors[exp.category] || categoryColors.General}`}>{exp.category}</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
