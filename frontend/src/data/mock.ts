export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  initials: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  type: 'transfer' | 'bill_split' | 'loan' | 'loan_repayment';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  note: string;
  date: string;
}

export interface BillSplit {
  id: string;
  description: string;
  totalAmount: number;
  creatorId: string;
  participants: { userId: string; name: string; amount: number; paid: boolean }[];
  createdAt: string;
}

export interface Loan {
  id: string;
  lenderId: string;
  lenderName: string;
  borrowerId: string;
  borrowerName: string;
  originalAmount: number;
  amountRepaid: number;
  dueDate: string;
  status: 'active' | 'completed' | 'overdue' | 'requested';
}

export interface KhataGroup {
  id: string;
  name: string;
  contributionAmount: number;
  cycleType: 'Monthly' | 'Weekly';
  startDate: string;
  members: { userId: string; name: string; turnOrder: number }[];
  currentCycle: number;
  contributions: { memberId: string; memberName: string; cycle: number; paid: boolean }[];
}

export interface SavingVault {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  createdAt: string;
}

export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  category: 'Housing' | 'Utilities' | 'Subscriptions' | 'Health' | 'Insurance';
  dueDay: number;
  active: boolean;
}

export interface Friend {
  id: string;
  userId: string;
  username: string;
  initials: string;
  status: 'accepted' | 'pending';
}

export const currentUser: User = {
  id: 'u1',
  username: 'Alex Morgan',
  email: 'alex@fintrack.com',
  initials: 'AM',
};

export const friends: Friend[] = [
  { id: 'f1', userId: 'u2', username: 'Sarah Chen', initials: 'SC', status: 'accepted' },
  { id: 'f2', userId: 'u3', username: 'James Wilson', initials: 'JW', status: 'accepted' },
  { id: 'f3', userId: 'u4', username: 'Maria Garcia', initials: 'MG', status: 'accepted' },
  { id: 'f4', userId: 'u5', username: 'David Kim', initials: 'DK', status: 'pending' },
  { id: 'f5', userId: 'u6', username: 'Emily Davis', initials: 'ED', status: 'accepted' },
  { id: 'f6', userId: 'u7', username: 'Tom Brown', initials: 'TB', status: 'pending' },
];

export const transactions: Transaction[] = [
  { id: 'tx1', senderId: 'u1', senderName: 'Alex Morgan', receiverId: 'u2', receiverName: 'Sarah Chen', amount: 250, type: 'transfer', status: 'completed', note: 'Dinner reimbursement', date: '2026-04-13' },
  { id: 'tx2', senderId: 'u3', senderName: 'James Wilson', receiverId: 'u1', receiverName: 'Alex Morgan', amount: 500, type: 'loan_repayment', status: 'completed', note: 'Loan repayment', date: '2026-04-12' },
  { id: 'tx3', senderId: 'u1', senderName: 'Alex Morgan', receiverId: 'u4', receiverName: 'Maria Garcia', amount: 75, type: 'bill_split', status: 'pending', note: 'Restaurant bill', date: '2026-04-11' },
  { id: 'tx4', senderId: 'u1', senderName: 'Alex Morgan', receiverId: 'u5', receiverName: 'David Kim', amount: 1000, type: 'loan', status: 'completed', note: 'Emergency loan', date: '2026-04-10' },
  { id: 'tx5', senderId: 'u6', senderName: 'Emily Davis', receiverId: 'u1', receiverName: 'Alex Morgan', amount: 150, type: 'transfer', status: 'failed', note: 'Failed transfer', date: '2026-04-09' },
  { id: 'tx6', senderId: 'u1', senderName: 'Alex Morgan', receiverId: 'u3', receiverName: 'James Wilson', amount: 320, type: 'transfer', status: 'completed', note: 'Concert tickets', date: '2026-04-08' },
  { id: 'tx7', senderId: 'u2', senderName: 'Sarah Chen', receiverId: 'u1', receiverName: 'Alex Morgan', amount: 45, type: 'bill_split', status: 'completed', note: 'Uber ride', date: '2026-04-07' },
  { id: 'tx8', senderId: 'u1', senderName: 'Alex Morgan', receiverId: 'u6', receiverName: 'Emily Davis', amount: 200, type: 'loan_repayment', status: 'pending', note: 'Monthly repayment', date: '2026-04-06' },
];

export const billSplits: BillSplit[] = [
  {
    id: 'bs1', description: 'Team dinner at Olive Garden', totalAmount: 240, creatorId: 'u1', createdAt: '2026-04-10',
    participants: [
      { userId: 'u1', name: 'Alex Morgan', amount: 60, paid: true },
      { userId: 'u2', name: 'Sarah Chen', amount: 60, paid: true },
      { userId: 'u3', name: 'James Wilson', amount: 60, paid: false },
      { userId: 'u4', name: 'Maria Garcia', amount: 60, paid: false },
    ],
  },
  {
    id: 'bs2', description: 'Weekend trip gas', totalAmount: 120, creatorId: 'u1', createdAt: '2026-04-05',
    participants: [
      { userId: 'u1', name: 'Alex Morgan', amount: 40, paid: true },
      { userId: 'u2', name: 'Sarah Chen', amount: 40, paid: true },
      { userId: 'u6', name: 'Emily Davis', amount: 40, paid: true },
    ],
  },
  {
    id: 'bs3', description: 'Netflix subscription share', totalAmount: 20, creatorId: 'u2', createdAt: '2026-04-01',
    participants: [
      { userId: 'u1', name: 'Alex Morgan', amount: 5, paid: true },
      { userId: 'u2', name: 'Sarah Chen', amount: 5, paid: true },
      { userId: 'u3', name: 'James Wilson', amount: 5, paid: true },
      { userId: 'u4', name: 'Maria Garcia', amount: 5, paid: false },
    ],
  },
];

export const loans: Loan[] = [
  { id: 'l1', lenderId: 'u1', lenderName: 'Alex Morgan', borrowerId: 'u3', borrowerName: 'James Wilson', originalAmount: 2000, amountRepaid: 500, dueDate: '2026-06-15', status: 'active' },
  { id: 'l2', lenderId: 'u6', lenderName: 'Emily Davis', borrowerId: 'u1', borrowerName: 'Alex Morgan', originalAmount: 1500, amountRepaid: 1200, dueDate: '2026-05-01', status: 'active' },
  { id: 'l3', lenderId: 'u1', lenderName: 'Alex Morgan', borrowerId: 'u4', borrowerName: 'Maria Garcia', originalAmount: 500, amountRepaid: 500, dueDate: '2026-03-01', status: 'completed' },
  { id: 'l4', lenderId: 'u2', lenderName: 'Sarah Chen', borrowerId: 'u1', borrowerName: 'Alex Morgan', originalAmount: 800, amountRepaid: 200, dueDate: '2026-03-15', status: 'overdue' },
  { id: 'l5', lenderId: 'u1', lenderName: 'Alex Morgan', borrowerId: 'u5', borrowerName: 'David Kim', originalAmount: 1000, amountRepaid: 0, dueDate: '2026-07-01', status: 'requested' },
];

export const khataGroups: KhataGroup[] = [
  {
    id: 'kg1', name: 'Office Committee', contributionAmount: 500, cycleType: 'Monthly', startDate: '2026-01-01', currentCycle: 4,
    members: [
      { userId: 'u1', name: 'Alex Morgan', turnOrder: 1 },
      { userId: 'u2', name: 'Sarah Chen', turnOrder: 2 },
      { userId: 'u3', name: 'James Wilson', turnOrder: 3 },
      { userId: 'u4', name: 'Maria Garcia', turnOrder: 4 },
    ],
    contributions: [
      { memberId: 'u1', memberName: 'Alex Morgan', cycle: 4, paid: true },
      { memberId: 'u2', memberName: 'Sarah Chen', cycle: 4, paid: true },
      { memberId: 'u3', memberName: 'James Wilson', cycle: 4, paid: false },
      { memberId: 'u4', memberName: 'Maria Garcia', cycle: 4, paid: true },
    ],
  },
  {
    id: 'kg2', name: 'Friends Savings Circle', contributionAmount: 200, cycleType: 'Weekly', startDate: '2026-03-01', currentCycle: 7,
    members: [
      { userId: 'u1', name: 'Alex Morgan', turnOrder: 1 },
      { userId: 'u6', name: 'Emily Davis', turnOrder: 2 },
      { userId: 'u2', name: 'Sarah Chen', turnOrder: 3 },
    ],
    contributions: [
      { memberId: 'u1', memberName: 'Alex Morgan', cycle: 7, paid: true },
      { memberId: 'u6', memberName: 'Emily Davis', cycle: 7, paid: true },
      { memberId: 'u2', memberName: 'Sarah Chen', cycle: 7, paid: true },
    ],
  },
];

export const savingVaults: SavingVault[] = [
  { id: 'sv1', name: 'Vacation Fund', targetAmount: 5000, savedAmount: 3200, deadline: '2026-08-01', createdAt: '2026-01-15' },
  { id: 'sv2', name: 'Emergency Fund', targetAmount: 10000, savedAmount: 10000, deadline: '2026-04-01', createdAt: '2025-06-01' },
  { id: 'sv3', name: 'New Laptop', targetAmount: 2000, savedAmount: 800, deadline: '2026-03-01', createdAt: '2025-12-01' },
  { id: 'sv4', name: 'Wedding Gift', targetAmount: 300, savedAmount: 150, deadline: '2026-06-15', createdAt: '2026-03-01' },
];

export const fixedExpenses: FixedExpense[] = [
  { id: 'fe1', title: 'Rent', amount: 1200, category: 'Housing', dueDay: 1, active: true },
  { id: 'fe2', title: 'Electricity', amount: 85, category: 'Utilities', dueDay: 15, active: true },
  { id: 'fe3', title: 'Internet', amount: 60, category: 'Utilities', dueDay: 10, active: true },
  { id: 'fe4', title: 'Spotify', amount: 12, category: 'Subscriptions', dueDay: 5, active: true },
  { id: 'fe5', title: 'Gym', amount: 45, category: 'Health', dueDay: 1, active: true },
  { id: 'fe6', title: 'Health Insurance', amount: 200, category: 'Insurance', dueDay: 20, active: true },
  { id: 'fe7', title: 'Netflix', amount: 15, category: 'Subscriptions', dueDay: 12, active: false },
];

export const walletBalance = 12450.75;
export const monthlySalary = 5500;
export const totalFixedExpenses = fixedExpenses.filter(e => e.active).reduce((sum, e) => sum + e.amount, 0);

export const monthlyData = [
  { month: 'Nov', income: 5500, expenses: 3200 },
  { month: 'Dec', income: 5500, expenses: 4100 },
  { month: 'Jan', income: 5500, expenses: 2900 },
  { month: 'Feb', income: 5500, expenses: 3400 },
  { month: 'Mar', income: 5500, expenses: 3800 },
  { month: 'Apr', income: 5500, expenses: 2100 },
];

export const categoryColors: Record<string, string> = {
  Housing: 'bg-primary text-primary-foreground',
  Utilities: 'bg-info text-info-foreground',
  Subscriptions: 'bg-violet-500 text-primary-foreground',
  Health: 'bg-success text-success-foreground',
  Insurance: 'bg-warning text-warning-foreground',
};

export const typeColors: Record<string, string> = {
  transfer: 'bg-primary/15 text-primary border-primary/20',
  bill_split: 'bg-info/15 text-info border-info/20',
  loan: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  loan_repayment: 'bg-teal-100 text-teal-700 border-teal-200',
};

export const statusColors: Record<string, string> = {
  completed: 'bg-success/15 text-success border-success/20',
  pending: 'bg-warning/15 text-warning border-warning/20',
  failed: 'bg-destructive/15 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
  active: 'bg-primary/15 text-primary border-primary/20',
  overdue: 'bg-destructive/15 text-destructive border-destructive/20',
  requested: 'bg-info/15 text-info border-info/20',
  accepted: 'bg-success/15 text-success border-success/20',
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
