import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy, Receipt, Users, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService, SharedGroupResponse } from '../services/api';
import { calculateBalances } from '../utils/calculations';
import { buildMemberShareUrl, findMemberByIdentifier, normalizeShareIdentifier } from '../utils/share';

type SharedRouteParams = {
  groupId?: string;
  memberId?: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function SharedGroupPage() {
  const navigate = useNavigate();
  const { groupId = '', memberId } = useParams<SharedRouteParams>();
  const [data, setData] = useState<SharedGroupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    const controller = new AbortController();

    const loadShareData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        if (controller.signal.aborted) {
          return;
        }

        const payload = await apiService.getSharedGroup(groupId);
        setData(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load share link');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (groupId) {
      loadShareData();
    } else {
      setErrorMessage('Share link is missing');
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!data) return;

    if (memberId) {
      const matched = findMemberByIdentifier(data.members, memberId);
      setSelectedMemberId(matched?.id || '');
      return;
    }

    setSelectedMemberId('');
  }, [data, memberId]);

  const selectedMember = useMemo(
    () => data?.members.find((member) => member.id === selectedMemberId) || null,
    [data, selectedMemberId]
  );

  const balances = useMemo(() => {
    if (!data) return [];

    return calculateBalances(
      data.expenses.map((expense) => ({
        ...expense,
        splitBetween: expense.splitBetween,
      })),
      data.members.map((member) => ({
        id: member.id,
        name: member.name,
        color: member.color || '#3B82F6',
      })),
      (data.settlements || []).map((settlement) => ({
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
      }))
    );
  }, [data]);

  const selectedBalance = selectedMember
    ? balances.find((balance) => balance.personId === selectedMember.id)?.balance || 0
    : 0;

  const selectedExpenses = useMemo(() => {
    if (!data || !selectedMember) {
      return data?.expenses || [];
    }

    const selectedKey = normalizeShareIdentifier(selectedMember.id || selectedMember.name);

    return data.expenses.filter((expense) => {
      const paidByMatch = normalizeShareIdentifier(expense.paidBy) === selectedKey;
      const splitMatch = (expense.splitBetween || []).some((splitEntry) => normalizeShareIdentifier(splitEntry) === selectedKey);
      return paidByMatch || splitMatch;
    });
  }, [data, selectedMember]);

  const selectedSettlements = useMemo(() => {
    if (!data || !selectedMember) {
      return data?.simplifiedSettlements || data?.settlements || [];
    }

    const selectedKey = normalizeShareIdentifier(selectedMember.id || selectedMember.name);
    return (data.simplifiedSettlements || data.settlements || []).filter((settlement) => {
      return normalizeShareIdentifier(settlement.from) === selectedKey || normalizeShareIdentifier(settlement.to) === selectedKey;
    });
  }, [data, selectedMember]);

  const handleCopyPersonalLink = async () => {
    if (!data || !selectedMember) return;

    const link = buildMemberShareUrl(groupId, selectedMember.id || selectedMember.name);
    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('idle');
    }
  };

  const handleSelectMember = (memberIdToSelect: string) => {
    if (!groupId) return;
    const member = data?.members.find((item) => item.id === memberIdToSelect);
    if (!member) return;
    navigate(`/share/${groupId}/member/${encodeURIComponent(member.id || member.name)}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="dark-card relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100">
                <ShieldAlert className="h-4 w-4" />
                <span>Shared group view</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Budget Split Expenser</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {isLoading ? 'Loading group...' : data?.groupName || 'Shared Group'}
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedMember
                    ? `Viewing balances and expenses for ${selectedMember.name}`
                    : 'Choose a member to view a personalized share link and member-specific summary.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Members</p>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                  <Users className="h-4 w-4 text-cyan-300" />
                  <span>{data?.memberCount ?? 0}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Expenses</p>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                  <Receipt className="h-4 w-4 text-cyan-300" />
                  <span>{data?.expenses.length ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <section className="dark-card rounded-[28px] p-6 sm:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">Members</h2>
              <p className="mt-1 text-sm text-slate-400">Click a member to load their personalized view</p>
            </div>
            {selectedMember ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyPersonalLink}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                  {copyState === 'copied' ? 'Copied' : 'Copy personal link'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/share/${groupId}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-500/20"
                >
                  <ArrowRight className="h-4 w-4" />
                  View group
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(data?.members || []).map((member) => {
              const isActive = selectedMember?.id === member.id;
              const personalUrl = buildMemberShareUrl(groupId, member.id || member.name);

              return (
                <button
                  key={member.id || member.name}
                  type="button"
                  onClick={() => handleSelectMember(member.id || member.name)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_12px_40px_rgba(34,211,238,0.12)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-white">{member.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{member.id}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-200">
                      {isActive ? 'Selected' : 'View'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Personal link</p>
                  <p className="mt-1 truncate text-sm text-cyan-200">{personalUrl}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dark-card rounded-[28px] p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                {selectedMember ? `${selectedMember.name}'s balance` : 'Group balance'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">Balances are auto-loaded from the shared data</p>
            </div>
            {selectedMember ? (
              <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                {formatCurrency(selectedBalance)}
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : selectedSettlements.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {selectedSettlements.map((settlement, index) => (
                <div key={`${settlement.from}-${settlement.to}-${index}`} className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-display text-base font-semibold text-white">{settlement.from}</div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-cyan-200">→</span>
                        <span>pays</span>
                      </div>
                    </div>
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-lg font-semibold text-cyan-100">
                      {formatCurrency(settlement.amount)}
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="truncate font-display text-base font-semibold text-white">{settlement.to}</div>
                      <div className="mt-1 text-sm text-slate-400">receives</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-emerald-100">
              {selectedMember ? 'No settlements involve this member yet.' : 'Everyone is settled. No payments are needed.'}
            </div>
          )}
        </section>

        <section className="dark-card rounded-[28px] p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                {selectedMember ? `${selectedMember.name}'s expenses` : 'All expenses'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedMember ? 'Auto-filtered to the selected member' : 'Read-only history for this shared link'}
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">
              INR only
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : selectedExpenses.length > 0 ? (
            <div className="space-y-3">
              {selectedExpenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-semibold text-white">{expense.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Paid by {expense.paidByName} · {expense.category}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-cyan-200">{formatCurrency(expense.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-slate-400">
              No expenses were shared for this group.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}