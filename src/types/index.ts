export interface Person {
  id: string;
  name: string;
  email?: string;
  upiId?: string;
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
  settlements?: RecordedSettlement[];
  createdAt: string;
  shareCode?: string;
  shareToken?: string;
  autoDelete?: boolean;
  deleteAfter?: 'immediately' | '1-day' | '3-days' | '7-days';
  deleteScheduledAt?: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface RecordedSettlement {
  from: string;
  fromId?: string;
  to: string;
  toId?: string;
  amount: number;
  settledAt: string;
}

export interface Balance {
  personId: string;
  balance: number; // positive = owed money, negative = owes money
}