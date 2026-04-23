import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { HandCoins, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/format";

export default function LoansPage() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [lenderUsername, setLenderUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const queryClient = useQueryClient();

  const { data: me } = useCurrentUser();
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: api.loans.getAll });
  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });

  const requestMutation = useMutation({
    mutationFn: api.loans.requestLoan,
    onSuccess: async () => {
      toast.success("Loan requested");
      setRequestOpen(false);
      setLenderUsername("");
      setAmount("");
      setDueDate("");
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: api.loans.approve,
    onSuccess: async () => {
      toast.success("Loan approved");
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Approve failed"),
  });

  const repayMutation = useMutation({
    mutationFn: ({ loanId, repayAmount }: { loanId: number; repayAmount: number }) => api.loans.repay(loanId, repayAmount),
    onSuccess: async () => {
      toast.success("Repayment submitted");
      await queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Repayment failed"),
  });

  const lending = loans.filter((loan) => loan.lender === me?.username);
  const borrowing = loans.filter((loan) => loan.borrower === me?.username);

  const LoanCard = ({
    loan,
    isBorrower,
  }: {
    loan: {
      loan_id: number;
      amount: number;
      amount_repaid: number;
      remaining: number;
      due_date: string;
      status: string;
      lender: string;
      borrower: string;
    };
    isBorrower: boolean;
  }) => {
    const originalAmount = toNumber(loan.amount);
    const amountRepaid = toNumber(loan.amount_repaid);
    const remaining = toNumber(loan.remaining);
    const progress = originalAmount > 0 ? (amountRepaid / originalAmount) * 100 : 0;
    const isOverdue = loan.status === "overdue";

    return (
      <Card className={`card-shadow ${isOverdue ? 'border-2 border-destructive' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground">
              {isBorrower ? loan.lender : loan.borrower}
            </CardTitle>
            <StatusBadge status={loan.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Original:</span> <span className="font-semibold">{formatCurrency(originalAmount)}</span></div>
            <div><span className="text-muted-foreground">Repaid:</span> <span className="font-semibold text-success">{formatCurrency(amountRepaid)}</span></div>
            <div><span className="text-muted-foreground">Remaining:</span> <span className="font-semibold">{formatCurrency(remaining)}</span></div>
            <div><span className="text-muted-foreground">Due:</span> <span className="font-semibold">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "-"}</span></div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% repaid</p>
          {isBorrower && loan.status === "active" && (
            <Button size="sm" className="w-full" onClick={() => repayMutation.mutate({ loanId: loan.loan_id, repayAmount: remaining })}>
              <HandCoins className="mr-2 h-4 w-4" />Repay
            </Button>
          )}
          {!isBorrower && loan.status === "requested" && (
            <Button size="sm" className="w-full" onClick={() => approveMutation.mutate(loan.loan_id)}>Approve Loan</Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Loans</h2>
          <p className="text-sm text-muted-foreground">Track lending and borrowing</p>
        </div>
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Request Loan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request a Loan</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestMutation.mutate({
                  lender_username: lenderUsername,
                  amount: Number(amount),
                  due_date: dueDate || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>From Friend</Label>
                <Select required value={lenderUsername} onValueChange={setLenderUsername}>
                  <SelectTrigger><SelectValue placeholder="Select friend" /></SelectTrigger>
                  <SelectContent>
                    {friends.map((f) => (
                      <SelectItem key={f.friendship_id} value={f.username}>{f.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00" min="1" required /></div>
              <div><Label>Due Date</Label><Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" /></div>
              <Button type="submit" className="w-full" disabled={requestMutation.isPending}>{requestMutation.isPending ? "Submitting..." : "Submit Request"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="lending">
        <TabsList>
          <TabsTrigger value="lending">I'm Lending</TabsTrigger>
          <TabsTrigger value="borrowing">I'm Borrowing</TabsTrigger>
        </TabsList>
        <TabsContent value="lending" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lending.map((loan) => <LoanCard key={loan.loan_id} loan={loan} isBorrower={false} />)}
          </div>
        </TabsContent>
        <TabsContent value="borrowing" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {borrowing.map((loan) => <LoanCard key={loan.loan_id} loan={loan} isBorrower={true} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
