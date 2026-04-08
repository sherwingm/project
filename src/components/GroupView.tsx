import { useState } from 'react';
import { Plus, Share2, Calculator, Receipt, Users, IndianRupee } from 'lucide-react';
import { Group } from '../types';
import { calculateBalances, calculateSettlements, getTotalExpenses } from '../utils/calculations';
import { ExpenseList } from './ExpenseList';
import { BalanceView } from './BalanceView';

interface GroupViewProps {
  group: Group;
  onAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => void;
  onGenerateShareCode: () => void;
  onOpenFairnessCalculator?: () => void;
}

export function GroupView({ group, onAddExpense, onDeleteExpense, onGenerateShareCode, onOpenFairnessCalculator }: GroupViewProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  
  const balances = calculateBalances(group.expenses, group.members);
  const settlements = calculateSettlements(balances);
  const totalExpenses = getTotalExpenses(group.expenses);

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'balances', label: 'Balances', icon: Calculator },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* card-like container with slight transparency to float over background */}
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-6">
      {/* Group Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{group.members.length} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <Receipt className="w-4 h-4" />
                <span>{group.expenses.length} expenses</span>
              </div>
              <div className="flex items-center space-x-1">
                <IndianRupee className="w-4 h-4" />
                <span>₹{totalExpenses.toFixed(2)} total</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onGenerateShareCode}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={onOpenFairnessCalculator}
              className="px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors flex items-center space-x-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Fairness</span>
            </button>
            <button
              onClick={onAddExpense}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Members</h3>
          <div className="flex flex-wrap gap-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: `${member.color}20`, color: member.color }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span>{member.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share Code */}
        {group.shareCode && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Share Code</h3>
                <p className="text-xs text-gray-500">Others can join using this code</p>
              </div>
              <div className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                {group.shareCode}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'expenses' && (
            <ExpenseList
              expenses={group.expenses}
              members={group.members}
              onDeleteExpense={onDeleteExpense}
            />
          )}
          {activeTab === 'balances' && (
            <BalanceView
              balances={balances}
              settlements={settlements}
              members={group.members}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}