import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator, TrendingUp, Copy, Check } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  amount: number;
}

interface PaymentPlan {
  from: string;
  to: string;
  amount: number;
}

interface CalculatorProps {
  onBack: () => void;
  groupMembers?: Array<{ id: string; name: string }>;
  groupExpenses?: Array<{ paidBy: string; amount: number; splitBetween: string[] }>;
}

export function FairnessCalculator({ onBack, groupMembers, groupExpenses }: CalculatorProps) {
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [people, setPeople] = useState<Person[]>(
    groupMembers && groupExpenses
      ? calculateFromGroupData(groupMembers, groupExpenses)
      : []
  );
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonAmount, setNewPersonAmount] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function calculateFromGroupData(members: any[], expenses: any[]) {
    const memberMap = new Map<string, { id: string; name: string; paid: number; owes: number }>();
    
    members.forEach(member => {
      memberMap.set(member.id, { id: member.id, name: member.name, paid: 0, owes: 0 });
    });

    expenses.forEach(expense => {
      const member = memberMap.get(expense.paidBy);
      if (member) {
        member.paid += expense.amount;
      }
      
      if (expense.splitBetween && expense.splitBetween.length > 0) {
        const perPerson = expense.amount / expense.splitBetween.length;
        expense.splitBetween.forEach((personId: string) => {
          const m = memberMap.get(personId);
          if (m) m.owes += perPerson;
        });
      }
    });

    return Array.from(memberMap.values()).map(member => ({
      ...member,
      amount: member.paid - member.owes,
      id: member.id
    }));
  }

  const handleAddPerson = () => {
    if (newPersonName.trim() && newPersonAmount) {
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: newPersonName,
        amount: parseFloat(newPersonAmount)
      };
      setPeople([...people, newPerson]);
      setNewPersonName('');
      setNewPersonAmount('');
    }
  };

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
  };

  const calculateSettlement = (): PaymentPlan[] => {
    const balances: Array<{ name: string; amount: number }> = people.map(p => ({ 
      name: p.name, 
      amount: p.amount 
    }));

    const debtors: Array<{ name: string; amount: number; index: number }> = [];
    const creditors: Array<{ name: string; amount: number; index: number }> = [];

    balances.forEach((balance, index) => {
      if (balance.amount < -0.01) {
        debtors.push({ name: balance.name, amount: Math.abs(balance.amount), index });
      } else if (balance.amount > 0.01) {
        creditors.push({ name: balance.name, amount: balance.amount, index });
      }
    });

    const payments: PaymentPlan[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      payments.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(amount * 100) / 100
      });

      debtors[i].amount -= amount;
      creditors[j].amount -= amount;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return payments;
  };

  const copyToClipboard = (settlement: PaymentPlan, index: number) => {
    const text = `${settlement.from} pays ${settlement.to} ${currencyFormatter.format(settlement.amount)}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const totalPaid = people.reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  const totalOwed = people.reduce((sum, p) => sum + Math.max(0, -p.amount), 0);
  const settlements = calculateSettlement();

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-8 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10">
            <ArrowLeft className="h-6 w-6 text-slate-200" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Calculator</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Fairness Calculator</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="dark-card rounded-[28px] p-6">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-white">
                <Calculator className="h-5 w-5 text-cyan-300" />
                <span>Add Expenses</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Person Name</label>
                  <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Enter name" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Amount Spent</label>
                  <input type="number" value={newPersonAmount} onChange={(e) => setNewPersonAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Enter amount" step="0.01" min="0" />
                </div>

                <button onClick={handleAddPerson} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400">
                  <Plus className="h-5 w-5" />
                  <span>Add Person</span>
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {people.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">No people added yet</p>
                ) : (
                  people.map((person) => (
                    <div key={person.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex-1">
                        <p className="font-medium text-white">{person.name}</p>
                        <p className="text-sm text-slate-400">{currencyFormatter.format(person.amount)}</p>
                      </div>
                      <button onClick={() => handleRemovePerson(person.id)} className="rounded-xl border border-white/10 bg-white/5 p-1 transition hover:bg-rose-500/10">
                        <Trash2 className="h-4 w-4 text-rose-300" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {people.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="dark-card rounded-[24px] p-6">
                  <p className="mb-2 text-sm text-slate-400">Total Paid</p>
                  <p className="text-3xl font-bold text-emerald-300">{currencyFormatter.format(totalPaid)}</p>
                </div>
                <div className="dark-card rounded-[24px] p-6">
                  <p className="mb-2 text-sm text-slate-400">Total Owed</p>
                  <p className="text-3xl font-bold text-rose-300">{currencyFormatter.format(totalOwed)}</p>
                </div>
              </div>
            )}

            {people.length > 0 && (
              <div className="dark-card rounded-[28px] p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Personal Balances</h3>
                <div className="space-y-3">
                  {people.map((person) => {
                    const balance = person.amount;
                    const isCreditor = balance > 0.01;
                    return (
                      <div key={person.id} className="flex items-center justify-between rounded-2xl border-l-4 border-white/10 bg-white/5 p-3" style={{ borderColor: isCreditor ? '#34d399' : '#fda4af' }}>
                        <div className="flex-1">
                          <p className="font-medium text-white">{person.name}</p>
                          <p className="text-sm text-slate-400">{isCreditor ? 'Should receive' : 'Should pay'}</p>
                        </div>
                        <div className={`text-right font-semibold ${isCreditor ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {isCreditor ? '✓ ' : '✗ '}{currencyFormatter.format(Math.abs(balance))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settlements.length > 0 && (
              <div className="dark-card rounded-[28px] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <TrendingUp className="h-5 w-5 text-cyan-300" />
                    <span>Settlement Plan</span>
                  </h3>
                  <p className="text-sm text-slate-400">{settlements.length} transaction(s)</p>
                </div>
                <div className="space-y-3">
                  {settlements.map((settlement, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          <span className="font-semibold text-rose-300">{settlement.from}</span>
                          <span className="mx-2 text-slate-500">→</span>
                          <span className="font-semibold text-emerald-300">{settlement.to}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{currencyFormatter.format(settlement.amount)}</p>
                      </div>
                      <button onClick={() => copyToClipboard(settlement, idx)} className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10" title="Copy to clipboard">
                        {copiedIndex === idx ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5 text-cyan-300" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {people.length === 0 && (
              <div className="dark-card rounded-[28px] p-12 text-center">
                <p className="text-lg text-slate-400">Add people and amounts to see the settlement plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
