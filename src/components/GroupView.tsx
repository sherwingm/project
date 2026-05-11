import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Share2, Calculator, Receipt, Users, IndianRupee, ArrowRight, Trash2, CreditCard } from 'lucide-react';
import { Group } from '../types';
import { calculateBalances, calculateSettlements, getTotalExpenses } from '../utils/calculations';
import { simplifyDebts } from '../utils/simplifyDebts';
import { ExpenseList } from './ExpenseList';
import { BalanceView } from './BalanceView';
import { apiService } from '../services/api';
import { buildAppUPILink, getBudgetSplitSettlementNote, getGroupJoinUrl, isMobileDevice, isValidUpiId, openUPIPayment } from '../utils/upi';
import { QRCodeSVG } from 'qrcode.react';

interface GroupViewProps {
  group: Group;
  currentUserId?: string;
  currentUserName?: string;
  onAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense?: (expenseId: string, updates: Partial<Omit<Group['expenses'][number], 'id'>>) => Promise<void> | void;
  onDeleteGroup?: () => Promise<void> | void;
  onGenerateShareCode: () => Promise<string>;
  onOpenFairnessCalculator?: () => void;
  onRecordSettlement?: (settlement: {
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
  }) => Promise<void> | void;
}

export function GroupView({ group, currentUserId, currentUserName, onAddExpense, onDeleteExpense, onEditExpense, onDeleteGroup, onGenerateShareCode, onOpenFairnessCalculator, onRecordSettlement }: GroupViewProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [showSimplifyDebts, setShowSimplifyDebts] = useState(false);
  const [showPayPanel, setShowPayPanel] = useState(false);
  const [activeSettlement, setActiveSettlement] = useState<{
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
    creditorUpiId?: string;
  } | null>(null);
  const [resolvedCreditorUpiId, setResolvedCreditorUpiId] = useState('');
  const [showDesktopFallback, setShowDesktopFallback] = useState(false);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);
  const [showUpiPrompt, setShowUpiPrompt] = useState(false);
  const [showShareQr, setShowShareQr] = useState(false);
  const [upiPromptError, setUpiPromptError] = useState('');
  const [enteredUpiId, setEnteredUpiId] = useState('');
  const [isRecordingSettlement, setIsRecordingSettlement] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = setTimeout(() => setToastMessage(''), 1800);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const getMemberByName = (name: string) => group.members.find((member) => member.name === name);

  const paymentNote = activeSettlement ? getBudgetSplitSettlementNote(group.name) : `BudgetSplit: ${group.name}`;
  const groupJoinQrLink = group.shareCode ? getGroupJoinUrl(group.shareCode) : '';

  const launchPayment = (toUpiId: string, toName: string, amount: number, note: string) => {
    if (!amount || amount <= 0) {
      setToastMessage('Invalid payment amount');
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

  const openPaymentApp = (scheme: 'gpay' | 'phonepe' | 'paytm', amount: number, name: string, upiId?: string) => {
    if (!isMobileDevice()) {
      setShowUpiPrompt(false);
      setShowDesktopFallback(true);
      return;
    }

    const url = buildAppUPILink(scheme, amount, name, upiId, paymentNote);
    if (!url) return;

    window.location.href = url;
  };

  const openUPIPayment = (app: 'gpay' | 'phonepe' | 'paytm', amount: number, name: string, upiId?: string) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      alert('UPI payments only work on mobile devices');
      return;
    }

    if (!amount || amount <= 0) {
      setToastMessage('Invalid payment amount');
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

  const copyPaymentDetails = async (_from: string, to: string, amount: number) => {
    const message = `Hey ${to}, please send ₹${amount.toFixed(2)} via UPI for expense split`;
    try {
      await navigator.clipboard.writeText(message);
      setToastMessage('Payment details copied!');
    } catch {
      setToastMessage('Unable to copy payment details');
    }
  };

  const copyUpiLink = async (upiLink: string) => {
    try {
      await navigator.clipboard.writeText(upiLink);
      setToastMessage('UPI link copied!');
    } catch {
      setToastMessage('Unable to copy UPI link');
    }
  };

  const openSettlementSheet = async (settlement: {
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
    creditorUpiId?: string;
  }) => {
    const creditor = getMemberByName(settlement.to);
    const fallbackUpi = settlement.creditorUpiId || creditor?.upiId || '';

    setShowDesktopFallback(false);
    setShowMarkAsPaid(false);
    setShowUpiPrompt(false);
    setUpiPromptError('');
    setEnteredUpiId('');
    setResolvedCreditorUpiId(fallbackUpi);
    setActiveSettlement({ ...settlement, creditorUpiId: fallbackUpi });

    try {
      const lookup = await apiService.getUserByName(settlement.to);
      const upiFromDb = lookup?.upiId || fallbackUpi;
      setResolvedCreditorUpiId(upiFromDb);
      setActiveSettlement((prev) => (prev ? { ...prev, creditorUpiId: upiFromDb } : prev));
      setShowUpiPrompt(!upiFromDb);
    } catch {
      // Keep fallback member UPI if lookup fails.
      setShowUpiPrompt(!fallbackUpi);
    }
  };

  const handleUPIPayment = (upiId: string, amount: number, name: string) => {
    launchPayment(upiId, name, amount, paymentNote);
  };

  const handleRecordSettlement = async () => {
    if (!activeSettlement) return;

    setIsRecordingSettlement(true);
    try {
      const payload = {
        from: activeSettlement.from,
        fromId: activeSettlement.fromId,
        to: activeSettlement.to,
        toId: activeSettlement.toId,
        amount: activeSettlement.amount,
      };

      if (onRecordSettlement) {
        await onRecordSettlement(payload);
      } else {
        await apiService.recordSettlement(group.id, payload);
      }

      setToastMessage('✓ Payment recorded!');
      setShowDesktopFallback(false);
      setShowMarkAsPaid(false);
      setActiveSettlement(null);
    } catch (error) {
      console.error('Failed to record settlement:', error);
      setToastMessage('Unable to record payment');
    } finally {
      setIsRecordingSettlement(false);
    }
  };

  const handleShareLink = async () => {
    try {
      const shareLink = await onGenerateShareCode();

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${group.name} - Budget Split`,
            text: `Join ${group.name} and split expenses together.`,
            url: shareLink,
          });
          setToastMessage('Shared successfully');
          return;
        } catch {
          // Fall back to clipboard copy below.
        }
      }

      await navigator.clipboard.writeText(shareLink);
      setToastMessage('Link copied!');
    } catch {
      setToastMessage('Unable to generate share link');
    }
  };

  const handleMarkDebtSettled = async (debt: { from: string; to: string; amount: number }) => {
    const debtor = group.members.find((member) => member.name === debt.from);
    const creditor = group.members.find((member) => member.name === debt.to);

    try {
      const payload = {
        from: debt.from,
        fromId: debtor?.id,
        to: debt.to,
        toId: creditor?.id,
        amount: debt.amount,
      };

      if (onRecordSettlement) {
        await onRecordSettlement(payload);
      } else {
        await apiService.recordSettlement(group.id, payload);
      }

      setToastMessage('✓ Payment recorded!');
      setShowPayPanel(false);
    } catch (error) {
      console.error('Failed to record pay-now settlement:', error);
      setToastMessage('Unable to record payment');
    }
  };
  
  const balances = calculateBalances(group.expenses, group.members, group.settlements || []);
  const settlements = calculateSettlements(balances);
  const totalExpenses = getTotalExpenses(group.expenses);

  const simplifyInput = useMemo(() => {
    const next: Record<string, number> = {};
    balances.forEach((balance) => {
      const member = group.members.find((m) => m.id === balance.personId);
      if (member) {
        next[member.name] = (next[member.name] || 0) + balance.balance;
      }
    });
    return next;
  }, [balances, group.members]);

  const simplifiedSettlements = useMemo(() => simplifyDebts(simplifyInput), [simplifyInput]);

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'balances', label: 'Balances', icon: Calculator },
  ] as const;
  const isCreator = Boolean(group.createdBy && currentUserId && group.createdBy.toString() === currentUserId);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] rounded-b-[40px] bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_28%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-32 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-40 -z-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="space-y-6">
        <div className="app-hero-panel rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="absolute inset-0 app-grid-overlay opacity-15" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4 px-8 py-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.34em] text-violet-200">
                Group overview
              </div>
              <div className="space-y-4">
                <h2 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">{group.name}</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  A live workspace for every split, settlement, and invite. Everything in this room is built for clarity.
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
                    <Users className="h-4 w-4 text-violet-300" />
                    <span>{group.members.length} members</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
                    <Receipt className="h-4 w-4 text-cyan-300" />
                    <span>{group.expenses.length} expenses</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-cyan-200 backdrop-blur-md">
                    <IndianRupee className="h-4 w-4" />
                    <span className="font-semibold tabular-nums">₹{totalExpenses.toFixed(2)} total</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-8 py-6 sm:grid-cols-2 xl:grid-cols-2 xl:justify-items-end">
              <button
                onClick={() => setShowSimplifyDebts((prev) => !prev)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 text-sm font-medium text-violet-100 transition hover:bg-violet-500/20"
              >
                <Calculator className="h-4 w-4" />
                Simplify debts
              </button>
              <button
                onClick={handleShareLink}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                onClick={() => setShowPayPanel(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
              >
                <CreditCard className="h-4 w-4" />
                Pay Now
              </button>
              <button
                onClick={onOpenFairnessCalculator}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                <Calculator className="h-4 w-4" />
                Fairness
              </button>
              {isCreator && (
                <button
                  onClick={onDeleteGroup}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete group
                </button>
              )}
              <button
                onClick={onAddExpense}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Add expense
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 px-8 pb-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md"
                title={member.upiId ? `${member.name} can receive UPI payments` : `${member.name} hasn't added UPI ID`}
              >
                <div className={`h-2.5 w-2.5 rounded-full ${member.upiId ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: member.color }} />
                <span>{member.name}</span>
              </div>
            ))}
          </div>

          {group.shareCode && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_50px_rgba(2,6,23,0.22)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Share code</h3>
                  <p className="mt-1 text-xs text-slate-500">Others can join using this code</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-lg font-semibold tracking-[0.2em] text-cyan-200 shadow-[0_12px_30px_rgba(6,182,212,0.12)]">
                    {group.shareCode}
                  </div>
                    <button
                      type="button"
                      onClick={() => setShowShareQr(true)}
                      className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                    QR
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showSimplifyDebts ? 'mt-6 max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="dark-card rounded-[24px] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-white">Settle up</h3>
                  <p className="mt-1 text-sm text-slate-400">Minimized transfers based on the current balances.</p>
                </div>
                <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-100">
                  {simplifiedSettlements.length} payment{simplifiedSettlements.length === 1 ? '' : 's'}
                </div>
              </div>

              {simplifiedSettlements.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-emerald-200">
                  No settlements needed. Everyone is balanced.
                </div>
              ) : (
                <div className="space-y-3">
                  {simplifiedSettlements.map((transaction, index) => {
                    const creditor = getMemberByName(transaction.to);
                    const debtor = getMemberByName(transaction.from);
                    const receiverUpiId = creditor?.upiId?.trim() || '';
                    const receiverName = creditor?.name || transaction.to;
                    const amount = Number(transaction.amount || 0).toFixed(2);
                    const upiHref = `upi://pay?pa=${receiverUpiId}&pn=${receiverName}&am=${amount}&cu=INR`;
                    const gpayHref = `tez://upi/pay?pa=${receiverUpiId}&pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=INR`;
                    const phonePeHref = `phonepe://pay?pa=${receiverUpiId}&pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=INR`;
                    const paytmHref = `paytmmp://pay?pa=${receiverUpiId}&pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=INR`;
                    const hasReceiverUpi = Boolean(receiverUpiId);

                    return (
                      <div
                        key={`${transaction.from}-${transaction.to}-${index}`}
                        className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 transition-all"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-wrap items-center gap-3 text-slate-100">
                            <span className="font-semibold text-rose-200">{transaction.from}</span>
                            <ArrowRight className="h-4 w-4 text-cyan-300" />
                            <span className="text-slate-200">owes {currencyFormatter.format(transaction.amount)}</span>
                            <ArrowRight className="h-4 w-4 text-cyan-300" />
                            <span className="font-semibold text-emerald-200">{transaction.to}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <a
                              href={hasReceiverUpi ? upiHref : undefined}
                              aria-disabled={!hasReceiverUpi}
                              onClick={(event) => {
                                if (!hasReceiverUpi) {
                                  event.preventDefault();
                                  setToastMessage('User hasn\'t added UPI ID');
                                }
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                hasReceiverUpi
                                  ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/20'
                                  : 'cursor-not-allowed border-slate-500/30 bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              Pay via UPI
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasReceiverUpi) {
                                  setToastMessage('User hasn\'t added UPI ID');
                                  return;
                                }
                                window.location.href = gpayHref;
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                hasReceiverUpi
                                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                  : 'cursor-not-allowed border-slate-500/30 bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              GPay
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasReceiverUpi) {
                                  setToastMessage('User hasn\'t added UPI ID');
                                  return;
                                }
                                window.location.href = phonePeHref;
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                hasReceiverUpi
                                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                  : 'cursor-not-allowed border-slate-500/30 bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              PhonePe
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasReceiverUpi) {
                                  setToastMessage('User hasn\'t added UPI ID');
                                  return;
                                }
                                window.location.href = paytmHref;
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                hasReceiverUpi
                                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                  : 'cursor-not-allowed border-slate-500/30 bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              Paytm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasReceiverUpi) {
                                  setToastMessage('User hasn\'t added UPI ID');
                                  return;
                                }
                                copyUpiLink(upiHref);
                              }}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                hasReceiverUpi
                                  ? 'border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/20'
                                  : 'cursor-not-allowed border-slate-500/30 bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              Copy link
                            </button>
                            <button
                              onClick={() => openSettlementSheet({
                                from: transaction.from,
                                fromId: debtor?.id,
                                to: transaction.to,
                                toId: creditor?.id,
                                amount: transaction.amount,
                                creditorUpiId: creditor?.upiId,
                              })}
                              className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                            >
                              Settle Up
                            </button>
                          </div>
                        </div>
                        {!hasReceiverUpi && (
                          <p className="mt-2 text-xs text-amber-200/90">User hasn't added UPI ID</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dark-card overflow-visible rounded-[28px]">
          <div className="border-b border-white/10 px-2 sm:px-4">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'border-b border-violet-400/60 bg-violet-500/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'expenses' && (
              <ExpenseList
                groupId={group.id}
                groupName={group.name}
                expenses={group.expenses}
                members={group.members}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onDeleteExpense={onDeleteExpense}
                onEditExpense={onEditExpense}
                onRecordSettlement={onRecordSettlement}
              />
            )}
            {activeTab === 'balances' && (
              <BalanceView
                balances={balances}
                settlements={settlements}
                members={group.members}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onSettleUp={openSettlementSheet}
              />
            )}
          </div>
        </div>
      </div>

      {activeSettlement && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setActiveSettlement(null)}>
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-display text-xl font-semibold tracking-tight text-white">Settle Up</h3>
            <p className="mt-2 text-sm text-slate-400">
              {activeSettlement.from} owes ₹{activeSettlement.amount.toFixed(2)} to {activeSettlement.to}
            </p>

            <div className="mt-5 space-y-3">
              {resolvedCreditorUpiId ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleUPIPayment(resolvedCreditorUpiId, activeSettlement.amount, activeSettlement.to)}
                    className="w-full rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 px-4 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:from-emerald-500/35 hover:to-cyan-500/35"
                  >
                    Pay via UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPaymentDetails(activeSettlement.from, activeSettlement.to, activeSettlement.amount)}
                    className="w-full rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-left text-sm font-medium text-violet-100 transition hover:bg-violet-500/15"
                  >
                    Share payment request
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openPaymentApp('gpay', activeSettlement.amount, activeSettlement.to)}
                    className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    Open GPay
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaymentApp('phonepe', activeSettlement.amount, activeSettlement.to)}
                    className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    Open PhonePe
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaymentApp('paytm', activeSettlement.amount, activeSettlement.to)}
                    className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-left text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    Open Paytm
                  </button>
                  <p className="text-xs text-amber-200/90">
                    Ask {activeSettlement.to} to add their UPI ID in Account Settings for direct payment.
                  </p>
                </>
              )}

              {showUpiPrompt && !resolvedCreditorUpiId && activeSettlement && (
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <p className="text-sm text-violet-100">🔔 {activeSettlement.to} hasn't added their UPI ID yet.</p>
                  <p className="mt-2 text-xs text-slate-300">Ask them to add it in Account Settings → UPI ID field.</p>
                  <p className="mt-2 text-xs text-slate-300">Or enter their UPI ID here to pay now:</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={enteredUpiId}
                      onChange={(e) => {
                        setEnteredUpiId(e.target.value);
                        if (upiPromptError) setUpiPromptError('');
                      }}
                      onBlur={() => {
                        if (enteredUpiId.trim() && !isValidUpiId(enteredUpiId)) {
                          setUpiPromptError('Enter a valid UPI ID (e.g. name@okicici, 9876543210@ybl)');
                        }
                      }}
                      placeholder="name@bank or number@upi"
                      className="flex-1 rounded-lg border border-white/15 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!enteredUpiId.trim() || !isValidUpiId(enteredUpiId) || !activeSettlement) {
                          setUpiPromptError('Enter a valid UPI ID (e.g. sherwin@okicici)');
                          return;
                        }

                        await apiService.updateUserUpiId(activeSettlement.toId || '', enteredUpiId.trim()).catch(() => undefined);
                        setResolvedCreditorUpiId(enteredUpiId.trim());
                        setShowUpiPrompt(false);
                        launchPayment(enteredUpiId.trim(), activeSettlement.to, activeSettlement.amount, paymentNote);
                      }}
                      disabled={!enteredUpiId.trim() || !isValidUpiId(enteredUpiId)}
                      className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Pay Now
                    </button>
                  </div>
                  {upiPromptError && <p className="mt-2 text-xs text-rose-300">{upiPromptError}</p>}
                </div>
              )}

              {showDesktopFallback && activeSettlement && (
                <div className="rounded-2xl border border-white/10 bg-[#101726] p-4">
                  <h4 className="text-sm font-semibold text-white">Complete payment manually</h4>
                  <p className="mt-2 text-xs text-slate-400">
                    UPI payments work on mobile only.
                  </p>
                  <p className="mt-2 text-xs text-slate-300">To pay ₹{activeSettlement.amount.toFixed(2)} to {activeSettlement.to}:</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <span>{resolvedCreditorUpiId}</span>
                      <button
                        type="button"
                        onClick={async () => navigator.clipboard.writeText(resolvedCreditorUpiId)}
                        className="text-xs text-cyan-200 hover:text-cyan-100"
                      >
                        📋
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <span>₹{activeSettlement.amount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={async () => navigator.clipboard.writeText(activeSettlement.amount.toFixed(2))}
                        className="text-xs text-cyan-200 hover:text-cyan-100"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs text-slate-300">GPay</div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs text-slate-300">PhonePe</div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs text-slate-300">Paytm</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRecordSettlement}
                    disabled={isRecordingSettlement}
                    className="mt-3 w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ✓ I've sent the payment
                  </button>
                </div>
              )}

              {showMarkAsPaid && !showDesktopFallback && (
                <button
                  type="button"
                  onClick={handleRecordSettlement}
                  disabled={isRecordingSettlement}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRecordingSettlement ? 'Recording…' : '✓ I\'ve sent the payment'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSettlement(null)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed right-4 top-20 z-50 rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {toastMessage}
        </div>
      )}

      {showShareQr && groupJoinQrLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          onClick={() => setShowShareQr(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0f1724] via-[#101b33] to-[#0b1020] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Scan to join</h3>
                <p className="mt-1 text-sm text-slate-300">Share this QR code so people can open the invite link on their phone.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareQr(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <QRCodeSVG value={groupJoinQrLink} size={196} bgColor="#ffffff" fgColor="#0f1724" level="M" includeMargin />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Join code {group.shareCode}</p>
                <p className="mt-1 text-xs text-slate-400">Anyone who scans this code can open the group join page.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <span className="truncate pr-3">{groupJoinQrLink}</span>
              <button
                type="button"
                onClick={async () => navigator.clipboard.writeText(groupJoinQrLink)}
                className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
              >
                Copy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPayPanel && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center" onClick={() => setShowPayPanel(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-bold text-white">Settle Up</h3>
              <button
                type="button"
                onClick={() => setShowPayPanel(false)}
                className="text-2xl leading-none text-slate-400 transition hover:text-white"
                aria-label="Close payment panel"
              >
                ×
              </button>
            </div>

            {simplifiedSettlements.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-8 text-center text-emerald-300 font-medium">
                ✓ Everyone is settled up!
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedSettlements.map((debt, index) => {
                  const creditor = group.members.find((member) => member.name === debt.to);
                  const debtor = group.members.find((member) => member.name === debt.from);
                  const isCurrentUserDebtor = Boolean(currentUserId && debtor?.id === currentUserId);
                  const upiId = creditor?.upiId?.trim() || '';
                  const upiLink = upiId
                    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(creditor?.name || debt.to)}&am=${debt.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(getBudgetSplitSettlementNote(group.name))}`
                    : null;

                  return (
                    <div key={`${debt.from}-${debt.to}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-300">
                          <span className="font-medium text-white">{debt.from}</span>
                          <span className="mx-2 text-gray-500">→</span>
                          <span className="font-medium text-white">{debt.to}</span>
                        </div>
                        <span className="font-bold tabular-nums text-cyan-400">₹{debt.amount.toFixed(2)}</span>
                      </div>

                      {isCurrentUserDebtor ? (
                        <div className="flex gap-2">
                          {upiLink ? (
                            <a
                              href={upiLink}
                              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                            >
                              Pay via UPI →
                            </a>
                          ) : (
                            <span className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-gray-500">
                              No UPI ID on file
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMarkDebtSettled(debt)}
                            className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-white/40 hover:text-white"
                          >
                            ✓ Mark as paid
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Awaiting their payment</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}