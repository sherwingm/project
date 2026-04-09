import { useState } from 'react';
import { Trash2, Calendar, User, Users, X } from 'lucide-react';
import { ExpenseItem, Person } from '../types';
import { apiService } from '../services/api';
import { buildAppUPILink, getBudgetSplitExpenseNote, isMobileDevice, isValidUpiId, openUPIPayment } from '../utils/upi';
import { QRCodeSVG } from 'qrcode.react';

interface ExpenseListProps {
  groupId: string;
  groupName: string;
  expenses: ExpenseItem[];
  members: Person[];
  currentUserId?: string;
  currentUserName?: string;
  onDeleteExpense: (expenseId: string) => void;
  onRecordSettlement?: (settlement: {
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
  }) => Promise<void> | void;
}

export function ExpenseList({ groupId: _groupId, groupName, expenses, members, currentUserId, currentUserName, onDeleteExpense, onRecordSettlement }: ExpenseListProps) {
  const getMemberById = (id: string) => members.find(m => m.id === id);
  const normalize = (value?: string) => (value || '').trim().toLowerCase();
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [activePayer, setActivePayer] = useState<Person | null>(null);
  const [enteredUpiId, setEnteredUpiId] = useState('');
  const [creditorUpiId, setCreditorUpiId] = useState('');
  const [showDesktopFallback, setShowDesktopFallback] = useState(false);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);
  const [showUpiPrompt, setShowUpiPrompt] = useState(false);
  const [upiPromptError, setUpiPromptError] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [paidRows, setPaidRows] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');

  const splitAmount = selectedExpense ? selectedExpense.amount / Math.max(selectedExpense.splitBetween.length, 1) : 0;
  const paidByMember = selectedExpense ? getMemberById(selectedExpense.paidBy) : undefined;
  const currentMember = members.find(
    (member) => member.id === currentUserId || normalize(member.name) === normalize(currentUserName)
  );
  const currentUserIsPayer = Boolean(
    selectedExpense &&
    paidByMember &&
    (paidByMember.id === currentUserId || normalize(paidByMember.name) === normalize(currentUserName))
  );

  const owingMembers = selectedExpense
    ? selectedExpense.splitBetween
        .filter((memberId) => memberId !== selectedExpense.paidBy)
        .map((memberId) => getMemberById(memberId))
        .filter((member): member is Person => Boolean(member))
    : [];

  const activeRowKey = selectedExpense && activePayer ? `${selectedExpense.id}:${activePayer.id}` : '';

  const paymentNote = selectedExpense ? getBudgetSplitExpenseNote(groupName, selectedExpense.name) : `BudgetSplit: ${groupName}`;
  const qrPaymentLink = selectedExpense && creditorUpiId
    ? `upi://pay?pa=${encodeURIComponent(creditorUpiId)}&pn=${encodeURIComponent(paidByMember?.name || '')}&am=${splitAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(paymentNote)}`
    : '';

  const launchPayment = (toUpiId: string, toName: string, amount: number, note: string) => {
    if (!amount || amount <= 0) {
      setToastMessage('Invalid payment amount');
      window.setTimeout(() => setToastMessage(''), 2000);
      return;
    }

    if (!isMobileDevice()) {
      setShowUpiPrompt(false);
      setShowDesktopFallback(true);
      return;
    }

    setShowUpiPrompt(false);
    openUPIPayment(toUpiId, toName, amount, note);
    setShowMarkAsPaid(false);
    window.setTimeout(() => setShowMarkAsPaid(true), 3000);
  };

  const openPaymentApp = (scheme: 'gpay' | 'phonepe' | 'paytm', amount: number, _expenseName: string, payeeName: string) => {
    if (!isMobileDevice()) {
      setShowDesktopFallback(true);
      return;
    }

    const url = buildAppUPILink(scheme, amount, payeeName, undefined, paymentNote);
    if (!url) return;

    window.location.href = url;
    setToastMessage(`Opened ${scheme === 'gpay' ? 'GPay' : scheme === 'phonepe' ? 'PhonePe' : 'Paytm'} for ${payeeName}`);
    window.setTimeout(() => setToastMessage(''), 2000);
  };

  const openUPIPayment = (app: 'gpay' | 'phonepe' | 'paytm', amount: number, name: string, upiId?: string) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      alert('UPI payments only work on mobile devices');
      return;
    }

    if (!amount || amount <= 0) {
      setToastMessage('Invalid payment amount');
      window.setTimeout(() => setToastMessage(''), 2000);
      return;
    }

    const normalizedAmount = Number(amount).toFixed(2);
    let url = '';

    if (upiId) {
      url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${normalizedAmount}&cu=INR&tn=BudgetSplit`;
    } else if (app === 'gpay') {
      url = `tez://upi/pay?pn=${encodeURIComponent(name)}&am=${normalizedAmount}&cu=INR`;
    } else if (app === 'phonepe') {
      url = `phonepe://pay?pn=${encodeURIComponent(name)}&amount=${normalizedAmount}`;
    } else if (app === 'paytm') {
      url = `paytmmp://pay?pn=${encodeURIComponent(name)}&amount=${normalizedAmount}`;
    }

    if (!url) return;
    window.location.href = url;
  };

  const preparePaymentForUser = async (member: Person) => {
    setActivePayer(member);
    setShowDesktopFallback(false);
    setShowMarkAsPaid(false);
    setShowUpiPrompt(false);
    setUpiPromptError('');

    if (!paidByMember?.name) {
      setCreditorUpiId('');
      setEnteredUpiId('');
      return;
    }

    try {
      const creditor = await apiService.getUserByName(paidByMember.name);
      const fetchedUpi = creditor?.upiId || '';
      setCreditorUpiId(fetchedUpi);
      setEnteredUpiId(fetchedUpi);
      setShowUpiPrompt(!fetchedUpi);
    } catch {
      setCreditorUpiId(paidByMember.upiId || '');
      setEnteredUpiId(paidByMember.upiId || '');
      setShowUpiPrompt(!paidByMember.upiId);
    }
  };

  const handleUPIPayment = (upiId: string, amount: number, name: string) => {
    launchPayment(upiId, name, amount, paymentNote);
  };

  const copyRequest = async (creditorName: string, amount: number) => {
    const message = `Hi ${creditorName}, sending ₹${amount.toFixed(2)} for the expense via UPI`;
    try {
      await navigator.clipboard.writeText(message);
      setToastMessage('Payment request copied');
      window.setTimeout(() => setToastMessage(''), 2000);
    } catch {
      setToastMessage('Unable to copy request');
      window.setTimeout(() => setToastMessage(''), 2000);
    }
  };

  const savePayeeUpiAndPay = async () => {
    if (!activePayer || !paidByMember || !enteredUpiId.trim()) return;

    if (!isValidUpiId(enteredUpiId)) {
      setUpiPromptError('Enter a valid UPI ID (e.g. sherwin@okicici)');
      return;
    }

    setIsSavingUpi(true);
    try {
      await apiService.updateUserUpiId(paidByMember.id, enteredUpiId.trim());

      launchPayment(enteredUpiId.trim(), paidByMember.name, splitAmount, paymentNote);
      setToastMessage(`${paidByMember.name}'s UPI ID saved. Opening payment...`);
      window.setTimeout(() => setToastMessage(''), 2300);
      setEnteredUpiId('');
    } catch {
      setToastMessage('Unable to save UPI ID');
      window.setTimeout(() => setToastMessage(''), 2200);
    } finally {
      setIsSavingUpi(false);
    }
  };

  const markAsPaid = async () => {
    if (!selectedExpense || !activePayer || !paidByMember || !onRecordSettlement) return;

    setIsRecording(true);
    try {
      await onRecordSettlement({
        from: activePayer.name,
        fromId: activePayer.id,
        to: paidByMember.name,
        toId: paidByMember.id,
        amount: splitAmount,
      });

      setPaidRows((prev) => ({
        ...prev,
        [`${selectedExpense.id}:${activePayer.id}`]: true,
      }));

      setToastMessage('✓ Payment recorded!');
      setShowDesktopFallback(false);
      setShowMarkAsPaid(false);
      setShowUpiPrompt(false);
      setUpiPromptError('');
      setActivePayer(null);
      window.setTimeout(() => setToastMessage(''), 2200);
    } catch {
      setToastMessage('Unable to record payment');
      window.setTimeout(() => setToastMessage(''), 2200);
    } finally {
      setIsRecording(false);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-12 text-center text-slate-300">
        <ReceiptIcon className="mx-auto mb-4 h-16 w-16 text-slate-500" />
        <h3 className="mb-2 font-display text-lg font-semibold tracking-tight text-white">No expenses yet</h3>
        <p className="text-sm text-slate-400">Add your first expense to start tracking costs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => {
        const paidBy = getMemberById(expense.paidBy);
        const splitBetween = expense.splitBetween.map((id) => getMemberById(id)).filter(Boolean);
        const splitAmount = expense.amount / expense.splitBetween.length;

        return (
          <div
            key={expense.id}
            className="cursor-pointer rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07] hover:ring-2 hover:ring-indigo-500"
            onClick={() => {
              setSelectedExpense(expense);
              setActivePayer(null);
              setEnteredUpiId('');
              setCreditorUpiId('');
              setShowDesktopFallback(false);
              setShowMarkAsPaid(false);
              setShowUpiPrompt(false);
              setUpiPromptError('');
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-white">{expense.name}</h3>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">{expense.category}</span>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>Paid by {paidBy?.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>Split {splitBetween.length} ways</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold tabular-nums text-2xl text-cyan-200">₹{expense.amount.toFixed(2)}</div>
                  <div className="text-sm tabular-nums text-slate-400">₹{splitAmount.toFixed(2)} per person</div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {splitBetween.map((member) => (
                      <div
                        key={member?.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: member?.color }} />
                        <span>{member?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteExpense(expense.id);
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {expense.receiptImage && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <img
                  src={expense.receiptImage}
                  alt="Receipt"
                  className="max-w-xs max-h-48 rounded-2xl border border-white/10 object-contain"
                />
              </div>
            )}
          </div>
        );
      })}

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full rounded-t-[28px] border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50 sm:max-w-2xl sm:rounded-[28px]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-white">{selectedExpense.name}</h3>
                <p className="mt-1 text-sm text-slate-400">₹{selectedExpense.amount.toFixed(2)} · {selectedExpense.category}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedExpense(null);
                  setActivePayer(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div>Paid by: <span className="font-medium text-white">{paidByMember?.name || 'Unknown'}</span></div>
              <div className="mt-1">Date: <span className="font-medium text-white">{new Date(selectedExpense.date).toLocaleDateString()}</span></div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-slate-100">Who owes how much</h4>
              <p className="text-xs text-slate-400">
                This is for this expense only. Go to Balances tab to see total settlements across all expenses.
              </p>
              {currentUserIsPayer && paidByMember && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  ✓ You paid this expense. Waiting for others to settle.
                </div>
              )}
              {owingMembers.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Everyone is already settled for this expense.
                </div>
              ) : (
                owingMembers.map((member) => {
                  const rowKey = `${selectedExpense.id}:${member.id}`;
                  const isPaid = Boolean(paidRows[rowKey]);
                  const isCurrentUserRow = Boolean(
                    member.id === currentUserId || normalize(member.name) === normalize(currentUserName)
                  );

                  return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      isCurrentUserRow
                        ? 'border-indigo-400/40 bg-indigo-500/10 ring-2 ring-indigo-400'
                        : 'border-white/10 bg-white/5 opacity-70'
                    }`}
                  >
                    <div className="text-sm text-slate-200">
                      <span className="font-medium text-white">{member.name}</span> owes <span className="font-semibold text-cyan-200">₹{splitAmount.toFixed(2)}</span>{' '}
                      <span className="text-slate-400">to</span>{' '}
                      <span className="font-semibold text-emerald-200">{paidByMember?.name}</span>
                    </div>
                    {isPaid ? (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                        Paid ✓
                      </span>
                    ) : isCurrentUserRow ? (
                      <button
                        type="button"
                        onClick={() => preparePaymentForUser(member)}
                        className="rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                      >
                        Pay ₹{splitAmount.toFixed(2)} to {paidByMember?.name}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Awaiting their payment</span>
                    )}
                  </div>
                )})
              )}
            </div>

            {activePayer && paidByMember && (
              <div className="mt-5 space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <p className="text-sm font-medium text-violet-100">How would you like to pay {paidByMember.name}?</p>

                {creditorUpiId ? (
                  <button
                    type="button"
                    onClick={() => handleUPIPayment(creditorUpiId, splitAmount, paidByMember.name)}
                    className="w-full rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 px-4 py-2 text-left text-sm font-semibold text-emerald-100 transition hover:from-emerald-500/35 hover:to-cyan-500/35"
                  >
                    Pay via UPI
                  </button>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => openPaymentApp('gpay', splitAmount, selectedExpense.name, paidByMember.name)}
                        className="rounded-xl bg-[#1a73e8] px-2 py-2 text-sm font-semibold text-white"
                      >
                        🟦 GPay
                      </button>
                      <button
                        type="button"
                        onClick={() => openPaymentApp('phonepe', splitAmount, selectedExpense.name, paidByMember.name)}
                        className="rounded-xl bg-[#5f259f] px-2 py-2 text-sm font-semibold text-white"
                      >
                        🟣 PhonePe
                      </button>
                      <button
                        type="button"
                        onClick={() => openPaymentApp('paytm', splitAmount, selectedExpense.name, paidByMember.name)}
                        className="rounded-xl bg-[#0033a1] px-2 py-2 text-sm font-semibold text-white"
                      >
                        🟦 Paytm
                      </button>
                    </div>
                    <p className="text-xs text-amber-200/90">
                      Ask {paidByMember.name} to add their UPI ID in Account Settings for direct payment.
                    </p>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => copyRequest(paidByMember.name, splitAmount)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-left text-sm font-medium text-slate-100"
                >
                  📋 Copy payment request
                </button>
                {showUpiPrompt && !creditorUpiId && (
                  <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                    <p className="text-sm text-violet-100">
                      🔔 {paidByMember.name} hasn't added their UPI ID yet.
                    </p>
                    <p className="text-xs text-slate-300">
                      Ask them to add it in Account Settings → UPI ID field.
                    </p>
                    <p className="text-xs text-slate-300">Or enter their UPI ID here to pay now:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={enteredUpiId}
                        onChange={(e) => {
                          setEnteredUpiId(e.target.value);
                          if (upiPromptError) setUpiPromptError('');
                        }}
                        onBlur={() => {
                          if (enteredUpiId.trim() && !isValidUpiId(enteredUpiId)) {
                            setUpiPromptError('Enter a valid UPI ID (e.g. sherwin@okicici)');
                          }
                        }}
                        placeholder="name@bank or number@upi"
                        className="flex-1 rounded-lg border border-white/15 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
                      />
                      <button
                        type="button"
                        onClick={savePayeeUpiAndPay}
                        disabled={isSavingUpi || !enteredUpiId.trim() || !isValidUpiId(enteredUpiId)}
                        className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingUpi ? 'Saving…' : 'Pay Now'}
                      </button>
                    </div>
                    {upiPromptError && <p className="text-xs text-rose-300">{upiPromptError}</p>}
                    <p className="text-xs text-slate-400">{paidByMember.name} can receive UPI payments directly once they save their ID.</p>
                  </div>
                )}

                {showDesktopFallback && creditorUpiId && qrPaymentLink && (
                  <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#0f1724] via-[#101b33] to-[#0b1020] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-semibold text-white">Scan to pay on desktop</h5>
                        <p className="mt-1 text-xs text-slate-300">
                          Open any UPI app on your phone and scan this code.
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                        QR Pay
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                      <div className="rounded-2xl bg-white p-3 shadow-lg">
                        <QRCodeSVG value={qrPaymentLink} size={184} bgColor="#ffffff" fgColor="#0f1724" level="M" includeMargin />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">₹{splitAmount.toFixed(2)} to {paidByMember.name}</p>
                        <p className="text-xs text-slate-400">{paymentNote}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <span className="truncate pr-3">{creditorUpiId}</span>
                        <button
                          type="button"
                          onClick={async () => navigator.clipboard.writeText(creditorUpiId)}
                          className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <span>Amount</span>
                        <button
                          type="button"
                          onClick={async () => navigator.clipboard.writeText(splitAmount.toFixed(2))}
                          className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                        >
                          ₹{splitAmount.toFixed(2)}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={markAsPaid}
                      disabled={isRecording || paidRows[activeRowKey]}
                      className="mt-4 w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ✓ I've sent the payment
                    </button>
                  </div>
                )}

                {showMarkAsPaid && !showDesktopFallback && (
                  <button
                    type="button"
                    onClick={markAsPaid}
                    disabled={isRecording || paidRows[activeRowKey]}
                    className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ✓ I've sent the payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed right-4 top-20 z-50 rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {toastMessage}
        </div>
      )}
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