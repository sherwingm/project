export interface SimplifiedTransaction {
  from: string;
  to: string;
  amount: number;
}

export function simplifyDebts(
  balances: Record<string, number>
): SimplifiedTransaction[] {
  const creditors: Array<{ name: string; amount: number }> = [];
  const debtors: Array<{ name: string; amount: number }> = [];

  for (const [name, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ name, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ name, amount: Math.abs(rounded) });
    }
  }

  const settlements: SimplifiedTransaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedAmount,
      });
    }

    creditor.amount = Math.round((creditor.amount - roundedAmount) * 100) / 100;
    debtor.amount = Math.round((debtor.amount - roundedAmount) * 100) / 100;

    if (creditor.amount <= 0.01) {
      creditors.shift();
    }

    if (debtor.amount <= 0.01) {
      debtors.shift();
    }
  }

  return settlements;
}
