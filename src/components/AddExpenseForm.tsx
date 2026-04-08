import React, { useState } from 'react';
import { Camera, Upload, X, Loader, ArrowLeft } from 'lucide-react';
import { Person, ExpenseItem } from '../types';
import { processReceiptImage } from '../utils/ocr';

interface AddExpenseFormProps {
  group: any;
  members: Person[];
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
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

export function AddExpenseForm({ group: _group, members, onAddExpense, onCancel, onBack }: AddExpenseFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(members.map(m => m.id));
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReceiptUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const receiptData = await processReceiptImage(file);
      
      // Auto-fill form with OCR data
      if (receiptData.total) {
        setAmount(receiptData.total.toString());
      }
      
      if (receiptData.items.length > 0) {
        // Use the first item name or combine multiple items
        const itemNames = receiptData.items.slice(0, 3).map(item => item.name);
        setName(itemNames.join(', '));
      }

      // Convert image to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Failed to process receipt:', error);
      alert('Failed to process receipt. Please enter details manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleReceiptUpload(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || splitBetween.length === 0) return;

    onAddExpense({
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      paidBy,
      splitBetween,
      date: new Date().toISOString(),
      receiptImage: receiptImage || undefined,
    });
  };

  const toggleMemberSplit = (memberId: string) => {
    setSplitBetween(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-semibold">Add New Expense</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-gray-600">Processing receipt...</span>
                </div>
              ) : receiptImage ? (
                <div className="space-y-3">
                  <img
                    src={receiptImage}
                    alt="Receipt"
                    className="max-w-xs max-h-48 object-contain mx-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove receipt
                  </button>
                </div>
              ) : (
                <div>
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Upload a receipt to auto-fill details</p>
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
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

          {/* Expense Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Name *
              </label>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Dinner at restaurant"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const paidBySelect = e.currentTarget.form?.querySelector('select') as HTMLSelectElement;
                    paidBySelect?.focus();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Between */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Split Between ({splitBetween.length} members)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {members.map(member => (
                <label
                  key={member.id}
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    splitBetween.includes(member.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={splitBetween.includes(member.id)}
                    onChange={() => toggleMemberSplit(member.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="text-sm font-medium">{member.name}</span>
                </label>
              ))}
            </div>
            {splitBetween.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                ₹{amount ? (parseFloat(amount) / splitBetween.length).toFixed(2) : '0.00'} per person
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !amount || splitBetween.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}