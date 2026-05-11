import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Upload, X, Loader, ArrowLeft, Lock, Pencil, Users, Hash, PieChart, Percent, Plus, Minus } from 'lucide-react';
import { Person, ExpenseItem } from '../types';
import { apiService } from '../services/api';

interface AddExpenseFormProps {
  group: any;
  members: Person[];
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => Promise<void> | void;
  onCancel: () => void;
  onBack: () => void;
}

const categories = [
  'Food & Dining',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Other'
];

type SplitMethod = 'equal' | 'exact' | 'shares' | 'percentage';

const splitTabs: Array<{
  id: SplitMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'equal', label: 'Equal', icon: Users },
  { id: 'exact', label: 'Exact', icon: Hash },
  { id: 'shares', label: 'Shares', icon: PieChart },
  { id: 'percentage', label: 'Percentage', icon: Percent },
];

const roundToTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const parseSafeNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function AddExpenseForm({ group: _group, members, onAddExpense, onCancel, onBack }: AddExpenseFormProps) {
  const uniqueMembers = useMemo(
    () => [...new Map(members.map(member => [member.name || member.id, member])).values()],
    [members]
  );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [paidBy, setPaidBy] = useState(uniqueMembers[0]?.id || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(uniqueMembers.map(member => member.id));
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [splitData, setSplitData] = useState<Record<string, string>>({});
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<'none' | 'confident' | 'suggestion'>('none');
  const [amountLocked, setAmountLocked] = useState(false);
  const [amountReadError, setAmountReadError] = useState(false);
  const [isRemovingReceipt, setIsRemovingReceipt] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setPaidBy((current) => current || uniqueMembers[0]?.id || '');
    setSplitBetween((current) => {
      const memberIds = new Set(uniqueMembers.map((member) => member.id));
      const next = current.filter((id) => memberIds.has(id));
      return next.length > 0 ? next : uniqueMembers.map((member) => member.id);
    });
  }, [uniqueMembers]);

  useEffect(() => {
    setSplitData({});
  }, [splitMethod]);

  const calculateSplits = () => {
    const totalAmount = parseSafeNumber(amount);
    const splitAmountsById: Record<string, number> = {};
    const availableMemberIds = uniqueMembers.map((member) => member.id);
    const selectedMemberIds = splitBetween.filter((memberId) => availableMemberIds.includes(memberId));

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { splitAmountsById, error: '' };
    }

    const applyPennyDrop = (memberIds: string[]) => {
      const roundedSum = roundToTwo(memberIds.reduce((sum, memberId) => sum + (splitAmountsById[memberId] || 0), 0));
      const difference = roundToTwo(totalAmount - roundedSum);

      if (difference === 0) {
        return;
      }

      const preferredRecipient = memberIds.includes(paidBy) ? paidBy : memberIds[0];
      if (!preferredRecipient) {
        return;
      }

      splitAmountsById[preferredRecipient] = roundToTwo((splitAmountsById[preferredRecipient] || 0) + difference);
    };

    if (splitMethod === 'equal') {
      if (selectedMemberIds.length === 0) {
        return { splitAmountsById, error: 'Select at least one member to split equally' };
      }

      const rawAmount = totalAmount / selectedMemberIds.length;
      selectedMemberIds.forEach((memberId) => {
        splitAmountsById[memberId] = roundToTwo(rawAmount);
      });

      applyPennyDrop(selectedMemberIds);
      return { splitAmountsById, error: '' };
    }

    if (splitMethod === 'exact') {
      let exactTotal = 0;

      uniqueMembers.forEach((member) => {
        const value = parseSafeNumber(splitData[member.id]);
        splitAmountsById[member.id] = value;
        exactTotal += value;
      });

      if (roundToTwo(exactTotal) !== roundToTwo(totalAmount)) {
        return { splitAmountsById, error: 'Exact amounts must add up to the total amount' };
      }

      return { splitAmountsById, error: '' };
    }

    if (splitMethod === 'shares') {
      let totalShares = 0;

      uniqueMembers.forEach((member) => {
        const shares = Math.max(0, Math.trunc(parseSafeNumber(splitData[member.id])));
        splitAmountsById[member.id] = shares;
        totalShares += shares;
      });

      if (totalShares <= 0) {
        return { splitAmountsById, error: 'Add at least one share to calculate the split' };
      }

      const activeMemberIds = uniqueMembers
        .filter((member) => (splitAmountsById[member.id] || 0) > 0)
        .map((member) => member.id);

      activeMemberIds.forEach((memberId) => {
        const shares = splitAmountsById[memberId] || 0;
        splitAmountsById[memberId] = roundToTwo((shares / totalShares) * totalAmount);
      });

      applyPennyDrop(activeMemberIds);
      return { splitAmountsById, error: '' };
    }

    if (splitMethod === 'percentage') {
      let totalPercent = 0;

      uniqueMembers.forEach((member) => {
        const percent = parseSafeNumber(splitData[member.id]);
        splitAmountsById[member.id] = percent;
        totalPercent += percent;
      });

      if (roundToTwo(totalPercent) !== 100) {
        return { splitAmountsById, error: 'Percentages must add up to 100%' };
      }

      const activeMemberIds = uniqueMembers
        .filter((member) => (splitAmountsById[member.id] || 0) > 0)
        .map((member) => member.id);

      activeMemberIds.forEach((memberId) => {
        const percent = splitAmountsById[memberId] || 0;
        splitAmountsById[memberId] = roundToTwo((percent / 100) * totalAmount);
      });

      applyPennyDrop(activeMemberIds);
      return { splitAmountsById, error: '' };
    }

    return { splitAmountsById, error: '' };
  };

  const splitPreview = calculateSplits();
  const splitError = splitPreview.error;

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2800);
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<{ imageBase64: string; mimeType: string; dataUrl: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
          dataUrl: result,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const scanReceiptWithGemini = async (imageFile: File): Promise<{ name: string; amount: number; confident: boolean }> => {
    const { imageBase64, mimeType } = await readFileAsBase64(imageFile);
    const response = await apiService.scanReceipt(imageBase64, mimeType);
    const name = typeof response.shopName === 'string' ? response.shopName.trim() : '';
    const amount = typeof response.totalAmount === 'number' ? response.totalAmount : Number(response.totalAmount || 0);
    const confidence = typeof response.confidence === 'number' ? response.confidence : 0;
    const confident = typeof response.nameConfident === 'boolean'
      ? response.nameConfident
      : confidence >= 0.65 && name.length > 0;

    return {
      name,
      amount: Number.isFinite(amount) ? amount : 0,
      confident,
    };
  };

  const processReceiptUpload = async (file: File) => {
    const { dataUrl } = await readFileAsBase64(file);

    setReceiptImage(dataUrl);
    setIsProcessing(true);
    setOcrConfidence('none');
    setAmountReadError(false);

    try {
      const result = await scanReceiptWithGemini(file);

      if (result.amount > 0) {
        setAmount(result.amount.toString());
        setAmountLocked(true);
        setAmountReadError(false);
      } else {
        setAmountLocked(false);
        setAmountReadError(true);
      }

      if (result.name && result.confident) {
        setName(result.name);
        setOcrConfidence('confident');
      } else {
        setOcrConfidence('suggestion');
      }

      if (!result.name && result.amount <= 0) {
        setOcrConfidence('none');
      }
    } catch (error) {
      console.error('Failed to process receipt:', error);
      setAmountLocked(false);
      setAmountReadError(true);
      showToast('Could not read receipt, please fill manually');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    await processReceiptUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleReceiptUpload(file);
    }
  };

  const handleRemoveReceipt = () => {
    setIsRemovingReceipt(true);
    window.setTimeout(() => {
      setReceiptImage(null);
      setName('');
      setAmount('');
      setOcrConfidence('none');
      setAmountLocked(false);
      setAmountReadError(false);
      setToastMessage('');
      setIsRemovingReceipt(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numericAmount = parseSafeNumber(amount);
      if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0 || splitPreview.error) return;

      const finalSplits = uniqueMembers
        .map((member) => ({
          userId: member.id,
          amountOwed: splitPreview.splitAmountsById[member.id] || 0,
        }))
        .filter((split) => split.amountOwed > 0);

      const finalSplitBetween = finalSplits.map((split) => split.userId);

      await Promise.resolve(
        onAddExpense({
          name: name.trim() || 'Expense',
          amount: numericAmount,
          category,
          paidBy,
          splitBetween: finalSplitBetween,
          splitMethod,
          splits: finalSplits,
          date: new Date().toISOString(),
          receiptImage: receiptImage || undefined,
        })
      );

      onCancel();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const toggleMemberSplit = (memberId: string) => {
    setSplitBetween(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const setMemberSplitValue = (memberId: string, value: string) => {
    setSplitData((current) => ({
      ...current,
      [memberId]: value,
    }));
  };

  const adjustShares = (memberId: string, delta: number) => {
    setSplitData((current) => {
      const nextValue = Math.max(0, (Math.trunc(parseSafeNumber(current[memberId])) || 0) + delta);
      return {
        ...current,
        [memberId]: String(nextValue),
      };
    });
  };

  const changeSplitMethod = (method: SplitMethod) => {
    setSplitMethod(method);
    setSplitData({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0f0f1a] text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Add expense</p>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-white">Capture the charge</h3>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {toastMessage && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-sm">
              {toastMessage}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Receipt (Optional)</label>
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-6 text-center">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <Loader className="h-5 w-5 animate-spin text-violet-400" />
                  <span className="text-sm font-medium text-violet-200 animate-pulse">🔍 Reading receipt with AI...</span>
                </div>
              ) : receiptImage ? (
                <div className="space-y-4">
                  <img
                    src={receiptImage}
                    alt="Receipt"
                    className="mx-auto max-h-56 max-w-xs rounded-2xl border border-white/10 object-contain"
                  />
                  {ocrConfidence === 'none' && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100">
                      We couldn't read the shop name clearly. Please enter it manually.
                    </div>
                  )}
                  {ocrConfidence === 'suggestion' && (
                    <div className="flex items-center justify-center">
                      <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                        AI suggestion - please verify
                      </span>
                    </div>
                  )}
                  {ocrConfidence === 'confident' && (
                    <div className="flex items-center justify-center">
                      <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                        Auto-filled from receipt
                      </span>
                    </div>
                  )}
                  {amountReadError && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200">
                      ⚠️ Couldn't read amount. Please enter manually.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className={`inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/15 ${isRemovingReceipt ? 'animate-shake' : ''}`}
                  >
                    <span>Remove receipt</span>
                  </button>
                </div>
              ) : (
                <div>
                  <Camera className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                  <p className="mb-3 text-sm text-slate-400">Upload a receipt to auto-fill details</p>
                  <label className="inline-flex cursor-pointer items-center rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose file
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Expense Name</label>
              {ocrConfidence === 'suggestion' && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                    AI suggestion - please verify
                  </span>
                </div>
              )}
              {ocrConfidence === 'confident' && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    Auto-filled from receipt
                  </span>
                </div>
              )}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const amountInput = e.currentTarget.form?.querySelector('input[type="number"]') as HTMLInputElement;
                    amountInput?.focus();
                  }
                }}
                placeholder={ocrConfidence === 'none' && receiptImage ? 'e.g. The Black Buck' : 'Dinner at restaurant'}
                aria-invalid={ocrConfidence === 'none' && Boolean(receiptImage)}
                className={`w-full rounded-2xl border px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 ${ocrConfidence === 'none' && receiptImage ? 'border-amber-400/50 bg-amber-500/5' : 'border-white/10 bg-white/5 focus:border-violet-400'}`}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Amount *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  readOnly={amountLocked}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (parseFloat(e.target.value || '0') > 0) {
                      setAmountReadError(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const paidBySelect = e.currentTarget.form?.querySelector('select') as HTMLSelectElement;
                      paidBySelect?.focus();
                    }
                  }}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 pr-24 tabular-nums text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 ${amountReadError ? 'border-red-400/60 ring-2 ring-red-400' : 'border-white/10 focus:border-violet-400'} ${amountLocked ? 'cursor-not-allowed opacity-95' : ''}`}
                  placeholder="0.00"
                  required
                  autoComplete="off"
                />
                {amountLocked && (
                  <div className="pointer-events-none absolute right-20 top-1/2 -translate-y-1/2 text-amber-300">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                {amountLocked && (
                  <button
                    type="button"
                    onClick={() => setAmountLocked(false)}
                    className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              {amountReadError && (
                <p className="mt-2 text-xs text-red-300">⚠️ Couldn't read amount. Please enter manually.</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const paidBySelect = e.currentTarget.form?.querySelector('select[name="paidBy"]') as HTMLSelectElement;
                    paidBySelect?.focus();
                  }
                }}
                className="dark-select w-full rounded-2xl px-4 py-3 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Paid By</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="dark-select w-full rounded-2xl px-4 py-3 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-300">Split method</label>
              <p className="text-xs text-slate-500">Live math updates as you type</p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/10 bg-white/5 p-2 md:grid-cols-4">
              {splitTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = splitMethod === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeSplitMethod(tab.id)}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_12px_30px_rgba(124,58,237,0.24)]'
                        : 'border border-transparent bg-transparent text-slate-400 hover:bg-white/8 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {splitError && (
              <p className="mt-2 text-sm text-amber-300">{splitError}</p>
            )}

            <div className="mt-4 space-y-3">
              {uniqueMembers.map((member) => {
                const owesAmount = splitPreview.splitAmountsById[member.id] || 0;
                const isIncluded = splitMethod === 'equal'
                  ? splitBetween.includes(member.id)
                  : owesAmount > 0;
                const splitInputValue = splitData[member.id] ?? '';

                return (
                  <div
                    key={member.id}
                    className={`rounded-[22px] border p-4 transition ${
                      isIncluded
                        ? 'border-violet-400/20 bg-violet-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl border border-white/10" style={{ backgroundColor: member.color }} />
                        <div>
                          <div className="font-medium text-white">{member.name}</div>
                          <div className="text-xs text-slate-400">
                            {isIncluded
                              ? `Owes ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(owesAmount)}`
                              : 'Not included'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:min-w-[220px] sm:justify-end">
                        {splitMethod === 'equal' && (
                          <label className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${splitBetween.includes(member.id) ? 'border-violet-400/30 bg-violet-500/15 text-violet-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                            <input
                              type="checkbox"
                              checked={splitBetween.includes(member.id)}
                              onChange={() => toggleMemberSplit(member.id)}
                              className="rounded border-white/20 text-violet-500 focus:ring-violet-500/30"
                            />
                            Include
                          </label>
                        )}

                        {splitMethod === 'exact' && (
                          <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <span className="mr-2 text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={splitInputValue}
                              onChange={(e) => setMemberSplitValue(member.id, e.target.value)}
                              className="w-24 bg-transparent text-right text-sm text-white outline-none placeholder:text-slate-500"
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {splitMethod === 'shares' && (
                          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-2">
                            <button
                              type="button"
                              onClick={() => adjustShares(member.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={splitInputValue}
                              onChange={(e) => setMemberSplitValue(member.id, String(Math.max(0, parseInt(e.target.value || '0', 10) || 0)))}
                              className="w-16 bg-transparent text-center text-sm text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => adjustShares(member.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {splitMethod === 'percentage' && (
                          <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={splitInputValue}
                              onChange={(e) => setMemberSplitValue(member.id, e.target.value)}
                              className="w-20 bg-transparent text-right text-sm text-white outline-none placeholder:text-slate-500"
                              placeholder="0"
                            />
                            <span className="ml-2 text-slate-400">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount || Number.isNaN(parseFloat(amount || '0')) || parseFloat(amount || '0') <= 0 || Boolean(splitError)}
              className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}