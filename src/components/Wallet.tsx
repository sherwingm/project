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
    <div className="relative min-h-screen bg-[#0f0f1a] py-8 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="pointer-events-none absolute left-[-6rem] top-24 -z-10 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-40 -z-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10">
            <ArrowLeft className="h-6 w-6 text-slate-200" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyan-300/70">Wallet</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Wallet</h1>
          </div>
        </div>

        <div className="app-hero-panel mb-8 rounded-[36px] p-6 sm:p-8">
          <div className="absolute inset-0 app-grid-overlay opacity-15" />
          <div className="relative grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Balance</p>
              <p className="mt-3 text-3xl font-bold text-cyan-200">₹{balance.toFixed(2)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Income</p>
              <p className="mt-3 text-3xl font-bold text-emerald-300">₹{incomeTotal.toFixed(2)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Expenses</p>
              <p className="mt-3 text-3xl font-bold text-rose-300">₹{expenseTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-300">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-400" />
            <span className="ml-3">Loading wallet data...</span>
          </div>
        ) : (
          <>
            <div className="dark-card mb-8 rounded-[30px] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Total Balance</h2>
                <WalletIcon className="h-8 w-8 text-cyan-300" />
              </div>
              <p className="text-5xl font-bold text-cyan-200">₹{balance.toFixed(2)}</p>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="dark-card rounded-[28px] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Total Income</h3>
                  <Plus className="h-6 w-6 text-emerald-300" />
                </div>
                <p className="text-3xl font-bold text-emerald-300">₹{incomeTotal.toFixed(2)}</p>
              </div>

              <div className="dark-card rounded-[28px] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Total Expenses</h3>
                  <Minus className="h-6 w-6 text-rose-300" />
                </div>
                <p className="text-3xl font-bold text-rose-300">₹{expenseTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="mb-8">
              <button
                onClick={() => setShowAddTransaction(!showAddTransaction)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-4 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400"
              >
                <Plus className="h-5 w-5" />
                <span>{showAddTransaction ? 'Cancel' : 'Add Transaction'}</span>
              </button>
            </div>

            {showAddTransaction && (
              <div className="dark-card mb-8 rounded-[30px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
                <h3 className="mb-6 text-lg font-semibold text-white">Add Transaction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Enter description" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Amount</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Enter amount" step="0.01" min="0" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Category (Optional)</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25">
                      <option value="">Select category</option>
                      <option value="Work">Work</option>
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button onClick={handleAddTransaction} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-cyan-400">
                    Add Transaction
                  </button>
                </div>
              </div>
            )}

            <div className="dark-card overflow-hidden rounded-[30px] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="border-b border-white/10 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <TrendingUp className="h-5 w-5 text-cyan-300" />
                  <span>Recent Transactions</span>
                </h3>
              </div>

              <div className="divide-y divide-white/10">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No transactions yet. Add one to get started!</div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-6 transition hover:bg-white/[0.04]">
                      <div className="flex flex-1 items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          {transaction.type === 'income' ? (
                            <Plus className="h-6 w-6 text-emerald-300" />
                          ) : (
                            <Minus className="h-6 w-6 text-rose-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{transaction.description}</p>
                          <p className="text-sm text-slate-400">{transaction.date} {transaction.category && `• ${transaction.category}`}</p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
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
