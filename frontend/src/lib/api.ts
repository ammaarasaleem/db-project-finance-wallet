import { clearToken, getToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5002/api";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json?.success === false) {
    const message = json?.message || "Request failed";
    if (response.status === 401) {
      clearToken();
    }
    throw new Error(message);
  }

  return (json as ApiResponse<T>).data;
}

export const api = {
  auth: {
    login: (payload: { email: string; password: string }) =>
      request<{ user_id: number; username: string; email: string; phone?: string; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    register: (payload: { username: string; email: string; phone?: string; password: string }) =>
      request<{ user_id: number; username: string; email: string; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    me: () =>
      request<{ user_id: number; username: string; email: string; phone?: string; balance?: number; currency?: string }>("/auth/me"),
    changePassword: (payload: { current_password: string; new_password: string }) =>
      request<null>("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  wallet: {
    get: () => request<{ wallet_id: number; balance: number; currency: string }>("/wallet"),
    getSummary: () =>
      request<{
        wallet: { balance: number; currency: string };
        total_sent: number;
        total_received: number;
        monthly_expenses: number;
        salary: { amount: number; pay_day: number } | null;
      }>("/wallet/summary"),
    getTransactions: (params?: { type?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.type) query.set("type", params.type);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));
      return request<Array<{
        transaction_id: number;
        type: string;
        amount: number;
        status: string;
        note: string | null;
        created_at: string;
        sender: string;
        receiver: string;
      }>>(`/wallet/transactions${query.toString() ? `?${query.toString()}` : ""}`);
    },
    deposit: (amount: number, note?: string) =>
      request<{ balance: number; currency: string }>("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ amount, note }),
      }),
    transfer: (payload: { receiver_username: string; amount: number; note?: string }) =>
      request<null>("/wallet/transfer", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  finance: {
    getOverview: () =>
      request<{
        salary: { amount: number; pay_day: number; currency: string } | null;
        expenses_by_category: Array<{ category: string; total: number }>;
        total_expenses: number;
        disposable_income: number;
        savings_rate: string;
      }>("/finance/overview"),
    getSalary: () => request<{ amount: number; pay_day: number; currency: string }>("/finance/salary"),
    setSalary: (payload: { amount: number; currency?: string; pay_day: number }) =>
      request<null>("/finance/salary", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getExpenses: () =>
      request<
        Array<{
          expense_id: number;
          title: string;
          amount: number;
          category: string;
          due_day: number;
          is_active: boolean;
        }>
      >("/finance/expenses"),
    addExpense: (payload: { title: string; amount: number; category: string; due_day: number }) =>
      request<{ expense_id: number }>("/finance/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateExpense: (
      id: number,
      payload: Partial<{ title: string; amount: number; category: string; due_day: number; is_active: boolean }>,
    ) =>
      request<null>(`/finance/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    deleteExpense: (id: number) =>
      request<null>(`/finance/expenses/${id}`, {
        method: "DELETE",
      }),
  },

  friends: {
    getAll: () =>
      request<Array<{ user_id: number; username: string; email: string; friendship_id: number }>>("/friends"),
    getPending: () =>
      request<Array<{ friendship_id: number; username: string; email: string }>>("/friends/pending"),
    sendRequest: (friend_username: string) =>
      request<null>("/friends/request", {
        method: "POST",
        body: JSON.stringify({ friend_username }),
      }),
    accept: (friendship_id: number) =>
      request<null>(`/friends/${friendship_id}/accept`, { method: "PUT" }),
    remove: (friendship_id: number) =>
      request<null>(`/friends/${friendship_id}`, { method: "DELETE" }),
  },

  loans: {
    getAll: () =>
      request<
        Array<{
          loan_id: number;
          amount: number;
          amount_repaid: number;
          remaining: number;
          due_date: string;
          status: string;
          note: string | null;
          lender: string;
          borrower: string;
        }>
      >("/loans"),
    requestLoan: (payload: { lender_username: string; amount: number; due_date?: string; note?: string }) =>
      request<{ loan_id: number }>("/loans/request", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    approve: (loan_id: number) => request<null>(`/loans/${loan_id}/approve`, { method: "PUT" }),
    reject: (loan_id: number) => request<null>(`/loans/${loan_id}/reject`, { method: "PUT" }),
    repay: (loan_id: number, amount: number) =>
      request<null>(`/loans/${loan_id}/repay`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
  },

  bills: {
    getAll: () =>
      request<
        Array<{
          split_id: number;
          description: string;
          total_amount: number;
          created_at: string;
          created_by: string;
          amount_owed: number;
          is_paid: boolean;
          participant_id: number;
        }>
      >("/bills"),
    create: (payload: { total_amount: number; description: string; participants: Array<{ username: string; amount_owed: number }> }) =>
      request<{ split_id: number }>("/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    details: (split_id: number) =>
      request<{ bill: Record<string, unknown>; participants: Array<{ username: string; amount_owed: number; is_paid: boolean }> }>(`/bills/${split_id}`),
    pay: (split_id: number) => request<null>(`/bills/${split_id}/pay`, { method: "POST" }),
  },

  vaults: {
    getAll: () =>
      request<
        Array<{
          id: number;
          vault_name: string;
          targetAmount: number;
          savedAmount: number;
          progress_percent: number;
          deadline: string;
          isAchieved: boolean;
        }>
      >("/vaults"),
    create: (payload: { vault_name: string; targetAmount: number; deadline?: string }) =>
      request<{ vault_id: number }>("/vaults", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deposit: (id: number, amount: number) =>
      request<{ savedAmount: number; isAchieved: boolean }>(`/vaults/${id}/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    withdraw: (id: number, amount: number) =>
      request<{ savedAmount: number }>(`/vaults/${id}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    remove: (id: number) => request<null>(`/vaults/${id}`, { method: "DELETE" }),
  },

  khata: {
    getGroups: () =>
      request<
        Array<{
          Id: number;
          Name: string;
          ContributionAmount: number;
          CycleType: string;
          StartDate: string;
          creator: string;
          member_count: number;
          total_collected: number;
        }>
      >("/khata"),
    create: (payload: { name: string; contributionAmount: number; cycleType: string; startDate: string }) =>
      request<{ groupId: number }>("/khata", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    addMember: (groupId: number, payload: { username: string; turnOrder: number }) =>
      request<null>(`/khata/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMembers: (groupId: number, cycleNumber?: number) =>
      request<
        | { members: Array<{ username: string; TurnOrder: number; JoinedOn?: string }>; unpaid_cycle: Array<{ username: string }> }
        | Array<{ username: string; TurnOrder: number; JoinedOn?: string }>
      >(`/khata/${groupId}/members${cycleNumber ? `?cycleNumber=${cycleNumber}` : ""}`),
    getContributions: (groupId: number) =>
      request<Array<{ username: string; CycleNumber: number; AmountPaid: number; PaidOn: string | null }>>(`/khata/${groupId}/contributions`),
    contribute: (groupId: number, cycleNumber: number) =>
      request<{ cycleNumber: number; amountPaid: number; newBalance: number }>(`/khata/${groupId}/contribute`, {
        method: "POST",
        body: JSON.stringify({ cycleNumber }),
      }),
    getNextTurnOrder: (groupId: number) =>
      request<{ nextTurnOrder: number }>(`/khata/${groupId}/next-turn-order`),
  },
};
