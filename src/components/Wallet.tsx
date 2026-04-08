import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, TrendingUp, Wallet as WalletIcon } from 'lucide-react';
import { apiService } from '../services/api';

interface WalletTransaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface WalletProps {
  onBack: () => void;
}

export function Wallet({ onBack }: WalletProps) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
      loadWalletData(user.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadWalletData = async (uid: string) => {
    try {
      setIsLoading(true);
      const walletData = await apiService.getWallet(uid);
      const walletTransactions = await apiService.getWalletTransactions(uid);
      
      setBalance(walletData.balance || 0);
      setTransactions(walletTransactions || []);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!userId || !description.trim() || !amount) return;
    
    try {
      const transactionData = {
        type,
        description: description.trim(),
        amount: parseFloat(amount),
        category: category || 'Other'
      };

      await apiService.addWalletTransaction(userId, transactionData);
      
      // Reload wallet data to get updated balance and transactions
      await loadWalletData(userId);

      // Reset form
      setDescription('');
      setAmount('');
      setCategory('');
      setShowAddTransaction(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const incomeTotal = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading wallet data...</span>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Total Balance</h2>
                <WalletIcon className="w-8 h-8" />
              </div>
              <p className="text-5xl font-bold">₹{balance.toFixed(2)}</p>
            </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Total Income</h3>
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">₹{incomeTotal.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Total Expenses</h3>
              <Minus className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">₹{expenseTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Add Transaction Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddTransaction(!showAddTransaction)}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{showAddTransaction ? 'Cancel' : 'Add Transaction'}</span>
          </button>
        </div>

        {/* Add Transaction Form */}
        {showAddTransaction && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Add Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category (Optional)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="Work">Work</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                onClick={handleAddTransaction}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Add Transaction
              </button>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Recent Transactions</span>
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No transactions yet. Add one to get started!
              </div>
            ) : (
              transactions.map(transaction => (
                <div key={transaction.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'income' ? (
                        <Plus className={`w-6 h-6 text-green-600`} />
                      ) : (
                        <Minus className={`w-6 h-6 text-red-600`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{transaction.date} {transaction.category && `• ${transaction.category}`}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
