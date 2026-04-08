export interface Person {
  id: string;
  name: string;
  email?: string;
  color: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category: string;
  date: string;
  receiptImage?: string;
}

export interface Group {
  id: string;
  name: string;
  members: Person[];
  expenses: ExpenseItem[];
  createdAt: string;
  shareCode?: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface Balance {
  personId: string;
  balance: number; // positive = owed money, negative = owes money
}