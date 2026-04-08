import { Trash2, Calendar, User, Users } from 'lucide-react';
import { ExpenseItem, Person } from '../types';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  members: Person[];
  onDeleteExpense: (expenseId: string) => void;
}

export function ExpenseList({ expenses, members, onDeleteExpense }: ExpenseListProps) {
  const getMemberById = (id: string) => members.find(m => m.id === id);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <ReceiptIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
        <p className="text-gray-600">Add your first expense to start tracking costs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => {
        const paidBy = getMemberById(expense.paidBy);
        const splitBetween = expense.splitBetween.map(id => getMemberById(id)).filter(Boolean);
        const splitAmount = expense.amount / expense.splitBetween.length;

        return (
          <div
            key={expense.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{expense.name}</h3>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {expense.category}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>Paid by {paidBy?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Split {splitBetween.length} ways</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gradient-primary font-caveat">
                    ₹{expense.amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    ₹{splitAmount.toFixed(2)} per person
                  </div>
                </div>

                {/* Split Between Members */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {splitBetween.map((member) => (
                      <div
                        key={member?.id}
                        className="flex items-center space-x-1 px-2 py-1 rounded text-xs"
                        style={{ 
                          backgroundColor: `${member?.color}20`, 
                          color: member?.color 
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: member?.color }}
                        />
                        <span>{member?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteExpense(expense.id)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Image */}
            {expense.receiptImage && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <img
                  src={expense.receiptImage}
                  alt="Receipt"
                  className="max-w-xs max-h-48 object-contain rounded border"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l-8-8-8 8V7a2 2 0 012-2h12a2 2 0 012 2v11z" />
    </svg>
  );
}