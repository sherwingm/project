import { ExpenseItem, Person, Balance, Settlement, RecordedSettlement } from '../types';

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
    const splitAmount = expense.amount / expense.splitBetween.length;
    
    // Person who paid gets credited
    balances[expense.paidBy] += expense.amount;
    
    // Everyone who should pay gets debited
    expense.splitBetween.forEach(personId => {
      balances[personId] -= splitAmount;
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