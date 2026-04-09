import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Receipt, Users, ShieldAlert } from 'lucide-react';

interface SharedSettlement {
  from: string;
  to: string;
  amount: number;
}

interface SharedExpense {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splitBetween: string[];
  category: string;
  date: string;
}

interface SharedGroupResponse {
  groupName: string;
  members: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  expenses: SharedExpense[];
  settlements: SharedSettlement[];
}

interface ShareViewProps {
  token: string;
}

export default function ShareView({ token }: ShareViewProps) {
  const [data, setData] = useState<SharedGroupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
    const controller = new AbortController();

    const loadShareData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(`/api/share/${token}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Unable to load share link');
        }

        const payload = (await response.json()) as SharedGroupResponse;
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

    loadShareData();

    return () => controller.abort();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="dark-card relative overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100">
                <ShieldAlert className="h-4 w-4" />
                <span>View-only - you’re not a member</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Shared expense group</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {isLoading ? 'Loading group...' : data?.groupName || 'Shared Group'}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Members</p>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                  <Users className="h-4 w-4 text-cyan-300" />
                  <span>{data?.members.length ?? 0}</span>
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
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">Who owes whom</h2>
              <p className="mt-1 text-sm text-slate-400">Simplified settlements for this group</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 sm:inline-flex">
              <ArrowRight className="h-4 w-4" />
              <span>Minimized transactions</span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : data?.settlements && data.settlements.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.settlements.map((settlement, index) => (
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
                      {currencyFormatter.format(settlement.amount)}
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
              Everyone is settled. No payments are needed.
            </div>
          )}
        </section>

        <section className="dark-card rounded-[28px] p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">All expenses</h2>
              <p className="mt-1 text-sm text-slate-400">Read-only history for this shared link</p>
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
          ) : data?.expenses && data.expenses.length > 0 ? (
            <div className="space-y-3">
              {data.expenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-semibold text-white">{expense.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Paid by {expense.paidByName} · {expense.category}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-cyan-200">{currencyFormatter.format(expense.amount)}</div>
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
