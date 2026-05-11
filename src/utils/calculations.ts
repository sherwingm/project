import { ExpenseItem, Person, Balance, Settlement, RecordedSettlement } from '../types';

export interface ExpenseTrendPoint {
  dateKey: string;
  label: string;
  amount: number;
}

function getExpenseSplitAmounts(expense: ExpenseItem) {
  if (Array.isArray(expense.splits) && expense.splits.length > 0) {
    return expense.splits
      .filter((split) => split && split.userId)
      .map((split) => ({
        userId: split.userId,
        amountOwed: Number(split.amountOwed || 0),
      }))
      .filter((split) => Number.isFinite(split.amountOwed));
  }

  const splitBetween = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];
  if (splitBetween.length === 0) {
    return [];
  }

  const amount = Number(expense.amount || 0);
  const perPerson = splitBetween.length > 0 ? amount / splitBetween.length : 0;
  return splitBetween.map((userId) => ({ userId, amountOwed: perPerson }));
}

export function calculateBalances(
  expenses: ExpenseItem[],
  members: Person[],
  settlements: RecordedSettlement[] = []
): Balance[] {
  const balances: { [personId: string]: number } = {};
  
  // Initialize balances
  members.forEach(member => {
    balances[member.id] = 0;
  });

  expenses.forEach(expense => {
    // Person who paid gets credited
    balances[expense.paidBy] += expense.amount;
    
    // Everyone who should pay gets debited
    getExpenseSplitAmounts(expense).forEach((split) => {
      balances[split.userId] = (balances[split.userId] || 0) - split.amountOwed;
    });
  });

  settlements.forEach((settlement) => {
    const fromId = settlement.fromId || settlement.from;
    const toId = settlement.toId || settlement.to;

    if (balances[fromId] !== undefined) {
      balances[fromId] += settlement.amount;
    }

    if (balances[toId] !== undefined) {
      balances[toId] -= settlement.amount;
    }
  });

  return members.map(member => ({
    personId: member.id,
    balance: Math.round(balances[member.id] * 100) / 100
  }));
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let i = 0, j = 0;
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const amount = Math.min(creditor.balance, -debtor.balance);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtor.personId,
        to: creditor.personId,
        amount: Math.round(amount * 100) / 100
      });
    }
    
    creditor.balance -= amount;
    debtor.balance += amount;
    
    if (creditor.balance < 0.01) i++;
    if (debtor.balance > -0.01) j++;
  }
  
  return settlements;
}

export function getTotalExpenses(expenses: ExpenseItem[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function getPersonExpenses(expenses: ExpenseItem[], personId: string): number {
  return expenses
    .filter(expense => expense.paidBy === personId)
    .reduce((total, expense) => total + expense.amount, 0);
}

export function aggregateExpenseTrend(
  expenses: ExpenseItem[],
  days: number = 7,
  locale: string = 'en-IN'
): ExpenseTrendPoint[] {
  const dailyTotals = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const dateKey = day.toISOString().slice(0, 10);
    dailyTotals.set(dateKey, 0);
  }

  expenses.forEach((expense) => {
    const parsed = new Date(expense.date);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    parsed.setHours(0, 0, 0, 0);
    const dateKey = parsed.toISOString().slice(0, 10);
    if (!dailyTotals.has(dateKey)) {
      return;
    }

    const next = (dailyTotals.get(dateKey) || 0) + Number(expense.amount || 0);
    dailyTotals.set(dateKey, Math.round(next * 100) / 100);
  });

  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return Array.from(dailyTotals.entries()).map(([dateKey, amount]) => ({
    dateKey,
    label: formatter.format(new Date(`${dateKey}T00:00:00`)),
    amount,
  }));
}