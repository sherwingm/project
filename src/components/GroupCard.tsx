import React, { useState } from 'react';
import { Users, Copy, Trash2, Plus, MessageCircle, Share2, CreditCard } from 'lucide-react';
import { buildMemberShareUrl } from '../utils/share';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    location: string;
    members: number;
    date: string;
    totalExpenses: number;
    shareCode?: string;
    shareToken?: string;
    memberIdentifier?: string;
    variantIndex?: number;
    expenses?: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    userBalance?: number;
    currency: string;
    imageUrl?: string;
  };
  onViewDetails: (groupId: string) => void;
  onDelete: (groupId: string) => void;

  // ✅ UPDATED: no argument (same as GroupView)
  onAddExpense?: () => void;
  onPayNow?: () => void;
  showPayNow?: boolean;
  showSettledBadge?: boolean;
  canDelete?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onViewDetails,
  onDelete,
  onAddExpense,
  onPayNow,
  showPayNow = false,
  showSettledBadge = false,
  canDelete = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const gradientPalettes = [
    'from-[#1A1A2E] via-[#24134A] to-[#2D1B69]',
    'from-[#0F2027] via-[#203A43] to-[#2C5364]',
    'from-[#1A0533] via-[#2E1065] to-[#3B0764]',
    'from-[#0D1117] via-[#172554] to-[#1C2951]',
    'from-[#111827] via-[#312E81] to-[#0F766E]',
  ];

  const palette = gradientPalettes[(group.variantIndex ?? 0) % gradientPalettes.length];

  const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const renderBalanceIndicator = () => {
    const userBalance = group.userBalance;
    if (userBalance === undefined) {
      return null;
    }

    if (Math.abs(userBalance) < 0.01) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          You are settled
        </span>
      );
    }

    if (userBalance > 0) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Owed to you: {formatAmount(userBalance)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        You owe: {formatAmount(Math.abs(userBalance))}
      </span>
    );
  };

  const handleCopy = async () => {
    if (group.id) {
      const shareLink = group.shareCode && group.memberIdentifier
        ? buildMemberShareUrl(group.shareCode, group.memberIdentifier)
        : group.shareToken
          ? `${window.location.origin}/share/${group.shareToken}`
          : `${window.location.origin}?join=${group.id}`;

      console.log('Attempting to copy share link:', shareLink);
      
      try {
        await navigator.clipboard.writeText(shareLink);
        console.log('Share link copied successfully');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleNativeShare = async () => {
    if (group.id && typeof navigator.share === 'function') {
      const joinLink = group.shareCode && group.memberIdentifier
        ? buildMemberShareUrl(group.shareCode, group.memberIdentifier)
        : group.shareToken
          ? `${window.location.origin}/share/${group.shareToken}`
          : `${window.location.origin}?join=${group.id}`;
      const shareMessage = `Join my expense group "${group.name}"`;
      
      try {
        await navigator.share({
          title: 'Join Expense Group',
          text: shareMessage,
          url: joinLink
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy if native share not available
      handleCopy();
    }
  };

  const handleWhatsAppShare = () => {
    if (group.id) {
      const joinLink = group.shareCode && group.memberIdentifier
        ? buildMemberShareUrl(group.shareCode, group.memberIdentifier)
        : group.shareToken
          ? `${window.location.origin}/share/${group.shareToken}`
          : `${window.location.origin}?join=${group.id}`;
      const message = `Join my expense group "${group.name}" using this link: ${joinLink}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-[#1a1a2e] shadow-[0_24px_80px_rgba(2,6,23,0.45)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_28px_90px_rgba(124,58,237,0.2)]"
      onClick={() => group.id && onViewDetails(group.id)}
    >
      <div className={`relative min-h-[280px] bg-gradient-to-br ${palette}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_32%)]" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative flex h-full min-h-[280px] flex-col">
          <div className="flex items-start justify-between p-4 text-white/95">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" />
              {group.members} members
            </div>
            <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {group.date}
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-2 pt-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
              {group.name.trim().charAt(0).toUpperCase() || 'G'}
            </div>
          </div>

          <div className="px-5 pb-4 pt-2">
            <h3 className="font-display text-[22px] font-bold tracking-tight text-slate-50">
              {group.name}
            </h3>
          </div>

          <div className="mt-auto border-t border-white/8 bg-black/30 px-5 py-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-400">Total expenses</span>
              <div className="flex items-center gap-2">
                {showSettledBadge && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-100">
                    ✓ Settled
                  </span>
                )}
                <span className="font-sans text-sm font-medium text-cyan-300">{group.location}</span>
              </div>
            </div>

            <div className="font-sans text-3xl font-semibold tabular-nums text-cyan-300">
              {formatAmount(group.totalExpenses || 0)}
            </div>

            <div className="mt-3">
              {renderBalanceIndicator()}
            </div>

            {showPayNow && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPayNow?.();
                }}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 font-sans font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:brightness-110"
              >
                <CreditCard className="h-4 w-4" />
                Pay Now
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (onAddExpense) {
                  onAddExpense();
                  return;
                }

                if (group.id) {
                  onViewDetails(group.id);
                }
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-sans font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-violet-500/30"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy();
                }}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title={isCopied ? 'Link copied!' : 'Copy share link'}
              >
                <Copy className="h-4 w-4" />
              </button>

              {typeof navigator.share === 'function' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNativeShare();
                  }}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  title="Share via apps"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleWhatsAppShare();
                }}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>

              {canDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(group.id || '');
                  }}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-white/8 bg-white/5 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  title="Delete group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;