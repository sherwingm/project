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
    const text = `${settlement.from} pays ${settlement.to} $${settlement.amount.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const totalPaid = people.reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  const totalOwed = people.reduce((sum, p) => sum + Math.max(0, -p.amount), 0);
  const settlements = calculateSettlement();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Fairness Calculator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                <Calculator className="w-5 h-5" />
                <span>Add Expenses</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person Name</label>
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Spent</label>
                  <input
                    type="number"
                    value={newPersonAmount}
                    onChange={(e) => setNewPersonAmount(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                  />
                </div>

                <button
                  onClick={handleAddPerson}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Person</span>
                </button>
              </div>

              {/* People List */}
              <div className="mt-6 space-y-2">
                {people.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No people added yet</p>
                ) : (
                  people.map(person => (
                    <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{person.name}</p>
                        <p className="text-sm text-gray-500">${person.amount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handleRemovePerson(person.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            {people.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-gray-600 text-sm mb-2">Total Paid</p>
                  <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-gray-600 text-sm mb-2">Total Owed</p>
                  <p className="text-3xl font-bold text-red-600">${totalOwed.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Who Paid What */}
            {people.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Balances</h3>
                <div className="space-y-3">
                  {people.map((person) => {
                    const balance = person.amount;
                    const isCreditor = balance > 0.01;
                    return (
                      <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4" style={{borderColor: isCreditor ? '#10b981' : '#ef4444'}}>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <p className="text-sm text-gray-500">
                            {isCreditor ? 'Should receive' : 'Should pay'}
                          </p>
                        </div>
                        <div className={`text-right font-semibold ${isCreditor ? 'text-green-600' : 'text-red-600'}`}>
                          {isCreditor ? '✓ $' : '✗ $'}{Math.abs(balance).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Settlement Plan */}
            {settlements.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span>Settlement Plan</span>
                  </h3>
                  <p className="text-sm text-gray-600">{settlements.length} transaction(s)</p>
                </div>
                <div className="space-y-3">
                  {settlements.map((settlement, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          <span className="text-red-600 font-semibold">{settlement.from}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-green-600 font-semibold">{settlement.to}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">${settlement.amount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(settlement, idx)}
                        className="p-2 hover:bg-blue-100 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {people.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-500 text-lg">Add people and amounts to see the settlement plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
