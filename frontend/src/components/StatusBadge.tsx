import { Badge } from "@/components/ui/badge";

const typeColors: Record<string, string> = {
  transfer: "bg-primary/15 text-primary border-primary/20",
  bill_split: "bg-info/15 text-info border-info/20",
  loan: "bg-indigo-100 text-indigo-700 border-indigo-200",
  loan_repayment: "bg-teal-100 text-teal-700 border-teal-200",
};

const statusColors: Record<string, string> = {
  completed: "bg-success/15 text-success border-success/20",
  pending: "bg-warning/15 text-warning border-warning/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/15 text-primary border-primary/20",
  overdue: "bg-destructive/15 text-destructive border-destructive/20",
  requested: "bg-info/15 text-info border-info/20",
  accepted: "bg-success/15 text-success border-success/20",
  rejected: "bg-muted text-muted-foreground border-border",
  repaid: "bg-success/15 text-success border-success/20",
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${typeColors[type] || ''}`}>
      {type.replace('_', ' ')}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize ${statusColors[status] || ''}`}>
      {status}
    </Badge>
  );
}
