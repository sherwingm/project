import { useMemo } from 'react';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Balance, Settlement, Person } from '../types';
import { simplifyDebts } from '../utils/simplifyDebts';

interface BalanceViewProps {
  balances: Balance[];
  settlements: Settlement[];
  members: Person[];
  currentUserId?: string;
  currentUserName?: string;
  onSettleUp?: (settlement: {
    from: string;
    to: string;
    amount: number;
    fromId?: string;
    toId?: string;
    creditorUpiId?: string;
  }) => void;
}

export function BalanceView({ balances, settlements, members, currentUserId, currentUserName, onSettleUp }: BalanceViewProps) {
  const getMemberById = (id: string) => members.find(m => m.id === id);
  const getMemberByName = (name: string) => members.find(m => m.name === name);

  const isSettled = settlements.length === 0;

  const simplifiedSettlements = useMemo(() => {
    const balanceMap: Record<string, number> = {};

    balances.forEach((balance) => {
      const member = getMemberById(balance.personId);
      if (member) {
        balanceMap[member.name] = balance.balance;
      }
    });

    return simplifyDebts(balanceMap);
  }, [balances, members]);

  return (
    <div className="space-y-6 text-slate-100">
      <div className={`rounded-[24px] border px-4 py-4 ${
        isSettled
          ? 'border-emerald-400/20 bg-emerald-500/10'
          : 'border-amber-400/20 bg-amber-500/10'
      }`}>
        <div className="flex items-center gap-2">
          {isSettled ? (
            <CheckCircle className="h-5 w-5 text-emerald-300" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-300" />
          )}
          <h3 className={`font-display text-lg font-semibold tracking-tight ${
            isSettled ? 'text-emerald-100' : 'text-amber-100'
          }`}>
            {isSettled ? 'All settled' : 'Pending settlements'}
          </h3>
        </div>
        <p className={`mt-1 text-sm ${isSettled ? 'text-emerald-100/80' : 'text-amber-100/80'}`}>
          {isSettled
            ? 'Everyone is even. No money needs to be exchanged.'
            : `${settlements.length} payment${settlements.length > 1 ? 's' : ''} needed to settle all debts.`}
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-display text-lg font-semibold tracking-tight text-white">Individual balances</h3>
        <div className="space-y-3">
          {balances.map((balance) => {
            const member = getMemberById(balance.personId);
            if (!member) return null;

            const isOwed = balance.balance > 0;
            const isEven = Math.abs(balance.balance) < 0.01;

            return (
              <div
                key={balance.personId}
                className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: member.color }} />
                  <span className="text-sm text-slate-200">{member.name}</span>
                </div>

                <div className="text-right">
                  {isEven ? (
                    <span className="text-sm font-medium text-slate-400">Even</span>
                  ) : isOwed ? (
                    <div>
                      <div className="font-semibold tabular-nums text-emerald-300">+₹{Math.abs(balance.balance).toFixed(2)}</div>
                      <div className="text-xs text-emerald-200/70">is owed</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold tabular-nums text-rose-300">-₹{Math.abs(balance.balance).toFixed(2)}</div>
                      <div className="text-xs text-rose-200/70">owes</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-display text-lg font-semibold tracking-tight text-white">Suggested settlements</h3>
        {simplifiedSettlements.length === 0 ? (
          <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
            No settlements needed. Everyone is balanced.
          </div>
        ) : (
          <div className="space-y-3">
            {simplifiedSettlements.map((settlement, index) => {
              const debtor = getMemberByName(settlement.from);
              const creditor = getMemberByName(settlement.to);
              const creditorUpiId = creditor?.upiId;
              const isCurrentUserSettlement = Boolean(
                debtor && (debtor.id === currentUserId || debtor.name === currentUserName)
              );

              return (
                <div
                  key={`${settlement.from}-${settlement.to}-${index}`}
                  className={`flex flex-col gap-4 rounded-[20px] border p-4 lg:flex-row lg:items-center lg:justify-between ${
                    isCurrentUserSettlement
                      ? 'border-indigo-400/40 bg-indigo-500/10 ring-2 ring-indigo-400'
                      : 'border-violet-400/20 bg-violet-500/10 opacity-65'
                  }`}
                >
                  <div className="text-sm text-slate-200">
                    <span className="font-semibold text-rose-200">{settlement.from}</span>
                    <span className="mx-2 text-slate-400">owes</span>
                    <span className="font-semibold text-cyan-200">₹{settlement.amount.toFixed(2)}</span>
                    <span className="mx-2 text-slate-400">to</span>
                    <span className="font-semibold text-emerald-200">{settlement.to}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSettleUp?.({
                      from: settlement.from,
                      to: settlement.to,
                      amount: settlement.amount,
                      fromId: debtor?.id,
                      toId: creditor?.id,
                      creditorUpiId,
                    })}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isCurrentUserSettlement
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20'
                        : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Pay ₹{settlement.amount.toFixed(2)} to {settlement.to}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {settlements.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-lg font-semibold tracking-tight text-white">Suggested payments</h3>
          <div className="space-y-3">
            {settlements.map((settlement, index) => {
              const fromMember = getMemberById(settlement.from);
              const toMember = getMemberById(settlement.to);

              if (!fromMember || !toMember) return null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 rounded-[20px] border border-violet-400/20 bg-violet-500/10 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: fromMember.color }} />
                      <span className="text-sm text-slate-200">{fromMember.name}</span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-cyan-300" />

                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: toMember.color }} />
                      <span className="text-sm text-slate-200">{toMember.name}</span>
                    </div>
                  </div>

                  <div className="font-semibold tabular-nums text-cyan-200">₹{settlement.amount.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}