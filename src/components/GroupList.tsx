import React, { useState } from 'react';
import { Users, Plus, UserPlus, Layers3, IndianRupee } from 'lucide-react';
import { Group } from '../types';
import GroupCard from './GroupCard';
import { calculateBalances } from '../utils/calculations';
import { simplifyDebts } from '../utils/simplifyDebts';
import { buildAppUPILink, getBudgetSplitSettlementNote, isMobileDevice } from '../utils/upi';

interface GroupListProps {
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  onCreateGroup: (
    name: string,
    members: string[],
    options: { autoDelete: boolean; deleteAfter: 'immediately' | '1-day' | '3-days' | '7-days' }
  ) => void;
  onDeleteGroup: (groupId: string) => void;
  onJoinGroup: (shareCode: string) => void;
  onOpenCreateGroup: () => void;
  pendingJoinCode: string | null;
  onAddExpense: (group: Group) => void;
  currentUserId?: string;
  currentUserName?: string;
  onRecordSettlement?: (
    groupId: string,
    settlement: { from: string; fromId?: string; to: string; toId?: string; amount: number }
  ) => Promise<void> | void;
}

export function GroupList({ groups, onSelectGroup, onCreateGroup, onDeleteGroup, onJoinGroup, onOpenCreateGroup: _onOpenCreateGroup, pendingJoinCode: _pendingJoinCode, onAddExpense, currentUserId, currentUserName, onRecordSettlement }: GroupListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [autoDelete, setAutoDelete] = useState(false);
  const [deleteAfter, setDeleteAfter] = useState<'immediately' | '1-day' | '3-days' | '7-days'>('immediately');
  const [payNowState, setPayNowState] = useState<{
    group: Group;
    userName: string;
    userId?: string;
    settlements: Array<{ from: string; to: string; amount: number; toId?: string }>;
    selected?: { from: string; to: string; amount: number; toId?: string };
  } | null>(null);
  const [isRecordingSettlement, setIsRecordingSettlement] = useState(false);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onCreateGroup(groupName.trim(), [], { autoDelete, deleteAfter });
      setGroupName('');
      setAutoDelete(false);
      setDeleteAfter('immediately');
      setShowCreateForm(false);
    }
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCode.trim()) {
      onJoinGroup(shareCode.trim().toUpperCase());
      setShareCode('');
      setShowJoinForm(false);
    }
  };

  const getUserPaySummary = (group: Group) => {
    const userMember = group.members.find((member) => member.id === currentUserId)
      || group.members.find((member) => member.name === currentUserName);

    if (!userMember) {
      return {
        userMember: null,
        userBalance: 0,
        owes: [] as Array<{ from: string; to: string; amount: number; toId?: string }>,
      };
    }

    const balances = calculateBalances(group.expenses, group.members, group.settlements || []);
    const byName: Record<string, number> = {};
    const userBalance = balances.find((balance) => balance.personId === userMember.id)?.balance || 0;

    balances.forEach((balance) => {
      const member = group.members.find((m) => m.id === balance.personId);
      if (member) {
        byName[member.name] = balance.balance;
      }
    });

    const owes = simplifyDebts(byName)
      .filter((settlement) => settlement.from === userMember.name)
      .map((settlement) => ({
        ...settlement,
        toId: group.members.find((member) => member.name === settlement.to)?.id,
      }));

    return { userMember, userBalance, owes };
  };

  const openPayNow = (group: Group) => {
    const { userMember, owes } = getUserPaySummary(group);
    if (!userMember || owes.length === 0) return;

    setPayNowState({
      group,
      userName: userMember.name,
      userId: userMember.id,
      settlements: owes,
      selected: owes[0],
    });
  };

  const openUPIPaymentLink = (app: 'gpay' | 'phonepe' | 'paytm', amount: number, name: string, upiId?: string, note?: string) => {
    if (!isMobileDevice()) {
      alert('UPI payments only work on mobile devices');
      return;
    }

    if (!amount || amount <= 0) {
      return;
    }

    const url = buildAppUPILink(app, amount, name, upiId, note || getBudgetSplitSettlementNote(name));
    if (!url) return;

    window.location.href = url;
  };

  const copyPaymentRequest = async () => {
    if (!payNowState?.selected) return;
    const message = `Hey ${payNowState.selected.to}, please send ₹${payNowState.selected.amount.toFixed(2)} via UPI for expense split`;
    await navigator.clipboard.writeText(message);
  };

  const markPayNowPaid = async () => {
    if (!payNowState?.selected || !onRecordSettlement) return;

    setIsRecordingSettlement(true);
    try {
      await onRecordSettlement(payNowState.group.id, {
        from: payNowState.userName,
        fromId: payNowState.userId,
        to: payNowState.selected.to,
        toId: payNowState.selected.toId,
        amount: payNowState.selected.amount,
      });
      setPayNowState(null);
    } finally {
      setIsRecordingSettlement(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-[32px]">Your Groups</h2>
            <p className="max-w-2xl text-sm text-slate-400 sm:text-base">Track, split, and settle — effortlessly</p>
          </div>
          <button
            onClick={_onOpenCreateGroup}
            className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-sans text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-violet-500/30"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-white/6 bg-white/5 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <Layers3 className="h-4 w-4 text-violet-300" />
            <span>{groups.length} Groups</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <IndianRupee className="h-4 w-4 text-cyan-300" />
            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(groups.reduce((sum, group) => sum + (group.expenses || []).reduce((groupSum, expense) => groupSum + expense.amount, 0), 0))} Total Tracked</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <Users className="h-4 w-4 text-emerald-300" />
            <span>{groups.reduce((sum, group) => sum + group.members.length, 0)} Members</span>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              console.log('Add Expense clicked, groups:', groups);
              if (groups.length > 0) {
                setShowGroupSelection(true);
              } else {
                _onOpenCreateGroup();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4" />
            <span>Join Group</span>
          </button>
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50">
              <h3 className="font-display mb-4 text-lg font-semibold tracking-tight text-slate-100">Create New Group</h3>
              <form onSubmit={handleCreateGroup}>
                  <div className="mb-4">
                    <label className="font-sans mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Group Name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="font-sans w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-normal text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                      placeholder="Trip to Paris"
                      required
                    />
                  </div>
                  <div className="mb-4 rounded-xl border border-white/8 bg-white/5 p-4 text-sm text-slate-300">
                    This group will start with only you. Invite friends after creation.
                  </div>
                  <div className="mb-4 rounded-xl border border-white/8 bg-white/5 p-4">
                    <label className="font-sans flex items-center gap-3 text-sm font-normal text-slate-200">
                      <input
                        type="checkbox"
                        checked={autoDelete}
                        onChange={(e) => setAutoDelete(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Auto-delete group when all expenses are settled
                    </label>
                    {autoDelete && (
                      <div className="mt-4">
                        <label className="font-sans mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Delete after</label>
                        <select
                          value={deleteAfter}
                          onChange={(e) => setDeleteAfter(e.target.value as 'immediately' | '1-day' | '3-days' | '7-days')}
                          className="font-sans w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-normal text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        >
                          <option value="immediately">Immediately</option>
                          <option value="1-day">1 day</option>
                          <option value="3-days">3 days</option>
                          <option value="7-days">7 days</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="font-sans flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium tracking-wide text-slate-400 transition-colors hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="font-sans flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-medium tracking-wide text-white shadow-lg shadow-violet-500/20 hover:scale-[1.01]"
                    >
                      Create Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showJoinForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
              <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50">
                <h3 className="font-display mb-4 text-lg font-semibold tracking-tight text-slate-100">Join Group</h3>
                <form onSubmit={handleJoinGroup}>
                  <div className="mb-4">
                    <label className="font-sans mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Share Code</label>
                    <input
                      type="text"
                      value={shareCode}
                      onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                      className="font-sans w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-normal uppercase text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                      placeholder="ABC123"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowJoinForm(false)}
                      className="font-sans flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium tracking-wide text-slate-400 transition-colors hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="font-sans flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-medium tracking-wide text-white shadow-lg shadow-violet-500/20 hover:scale-[1.01]"
                    >
                      Join Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="mt-6">
            {groups.length === 0 ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-white/8 bg-[#1a1a2e] p-10 text-center shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-semibold text-white" aria-hidden="true">
                  G
                </div>
                <h3 className="font-display mb-2 text-2xl font-semibold text-slate-100">No trips yet</h3>
                <p className="mb-6 text-slate-400">Create your first group and start splitting!</p>
                <button
                  onClick={_onOpenCreateGroup}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-sans font-medium text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02]"
                >
                  <span>Create your first group</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group, index) => (
                  (() => {
                    const { userMember, userBalance, owes } = getUserPaySummary(group);
                    const showPayNow = owes.length > 0;
                    const showSettledBadge = Boolean(userMember) && !showPayNow;
                    const canDelete = Boolean(group.createdBy && currentUserId && group.createdBy === currentUserId);

                    return (
                  <GroupCard
                    key={group.id}
                    group={{
                      id: group.id,
                      name: group.name,
                      location: group.name,
                      members: group.members.length,
                      date: new Date(group.createdAt).toLocaleDateString(),
                      totalExpenses: (group.expenses || []).reduce((sum, expense) => sum + expense.amount, 0),
                      shareCode: group.shareCode,
                      shareToken: group.shareToken,
                      memberIdentifier: userMember?.id || userMember?.name || currentUserName,
                      variantIndex: index,
                      expenses: (group.expenses || []).map((expense) => ({
                        id: expense.id,
                        name: expense.name,
                        amount: expense.amount,
                      })),
                      userBalance,
                      currency: '₹'
                    }}
                    onViewDetails={() => onSelectGroup(group)}
                    onDelete={onDeleteGroup}
                    onAddExpense={() => {
                      console.log('GroupCard Add Expense clicked for group:', group);
                      onAddExpense(group);
                    }}
                    showPayNow={showPayNow}
                    showSettledBadge={showSettledBadge}
                    canDelete={canDelete}
                    onPayNow={() => openPayNow(group)}
                  />
                    );
                  })()
                ))}
              </div>
            )}
          </div>

          {showGroupSelection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
              <div className="mx-4 w-full max-w-md rounded-2xl border border-white/8 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50">
                <h3 className="font-display mb-4 text-lg font-semibold tracking-tight text-slate-100">Select a Group</h3>
                <p className="font-sans mb-4 text-slate-400">Choose which group to add the expense to:</p>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        onAddExpense(group);
                        setShowGroupSelection(false);
                      }}
                      className="font-sans w-full rounded-xl border border-white/8 bg-white/5 p-3 text-left font-normal text-slate-200 transition-colors hover:bg-white/10"
                    >
                      <div className="font-display font-medium tracking-normal text-slate-100">{group.name}</div>
                      <div className="font-sans text-sm text-slate-400">{group.members.length} members</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGroupSelection(false)}
                  className="font-sans mt-4 w-full rounded-xl border border-white/10 px-4 py-3 font-medium tracking-wide text-slate-400 transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {payNowState && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
              <div className="w-full rounded-t-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl shadow-slate-950/50 sm:max-w-lg sm:rounded-2xl">
                <h3 className="font-display text-xl font-semibold text-white">Pay Now</h3>
                <p className="mt-1 text-sm text-slate-400">{payNowState.group.name}</p>

                <div className="mt-4 space-y-2">
                  {payNowState.settlements.map((settlement, idx) => (
                    <button
                      key={`${settlement.to}-${idx}`}
                      type="button"
                      onClick={() => setPayNowState((prev) => prev ? { ...prev, selected: settlement } : prev)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${payNowState.selected?.to === settlement.to && payNowState.selected?.amount === settlement.amount ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                    >
                      Pay ₹{settlement.amount.toFixed(2)} to {settlement.to}
                    </button>
                  ))}
                </div>

                {payNowState.selected && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                    {(() => {
                      const creditor = payNowState.group.members.find((member) => member.name === payNowState.selected?.to);
                      const note = getBudgetSplitSettlementNote(payNowState.group.name);

                      return creditor?.upiId ? (
                        <button
                          type="button"
                          onClick={() => openUPIPaymentLink('gpay', payNowState.selected!.amount, creditor.name, creditor.upiId, note)}
                          className="w-full rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 px-4 py-2 text-left text-sm font-semibold text-emerald-100"
                        >
                          Pay via UPI
                        </button>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={() => openUPIPaymentLink('gpay', payNowState.selected!.amount, payNowState.selected!.to, undefined, getBudgetSplitSettlementNote(payNowState.group.name))}
                      className="w-full rounded-xl bg-[#1a73e8] px-4 py-2 text-left text-sm font-semibold text-white"
                    >
                      Open GPay
                    </button>
                    <button
                      type="button"
                      onClick={() => openUPIPaymentLink('phonepe', payNowState.selected!.amount, payNowState.selected!.to, undefined, getBudgetSplitSettlementNote(payNowState.group.name))}
                      className="w-full rounded-xl bg-[#5f259f] px-4 py-2 text-left text-sm font-semibold text-white"
                    >
                      Open PhonePe
                    </button>
                    <button
                      type="button"
                      onClick={() => openUPIPaymentLink('paytm', payNowState.selected!.amount, payNowState.selected!.to, undefined, getBudgetSplitSettlementNote(payNowState.group.name))}
                      className="w-full rounded-xl bg-[#002970] px-4 py-2 text-left text-sm font-semibold text-white"
                    >
                      Open Paytm
                    </button>
                    <button
                      type="button"
                      onClick={copyPaymentRequest}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-left text-sm font-medium text-slate-100"
                    >
                      Copy request
                    </button>
                    <button
                      type="button"
                      onClick={markPayNowPaid}
                      disabled={isRecordingSettlement}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRecordingSettlement ? 'Recording…' : 'Mark as Paid ✓'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setPayNowState(null)}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}