import { useMemo, useState } from 'react';
import { Plus, Users, X } from 'lucide-react';

interface CreateGroupViewProps {
  onCreateGroup: (
    name: string,
    members: string[],
    options: { autoDelete: boolean; deleteAfter: 'immediately' | '1-day' | '3-days' | '7-days' }
  ) => Promise<void> | void;
  onCancel: () => void;
}

export function CreateGroupView({ onCreateGroup, onCancel }: CreateGroupViewProps) {
  const [groupName, setGroupName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>(['']);
  const [autoDelete, setAutoDelete] = useState(false);
  const [deleteAfter, setDeleteAfter] = useState<'immediately' | '1-day' | '3-days' | '7-days'>('immediately');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const hasName = groupName.trim().length > 0;
    const hasAnyMember = memberNames.some((m) => m.trim().length > 0);
    return hasName && hasAnyMember && !isSubmitting;
  }, [groupName, memberNames, isSubmitting]);

  const addMemberField = () => setMemberNames((prev) => [...prev, '']);

  const updateMemberName = (index: number, name: string) => {
    setMemberNames((prev) => prev.map((m, i) => (i === index ? name : m)));
  };

  const removeMemberField = (index: number) => {
    setMemberNames((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const validMembers = memberNames.map((m) => m.trim()).filter(Boolean);
    setIsSubmitting(true);
    try {
      await onCreateGroup(groupName.trim(), validMembers, { autoDelete, deleteAfter });
      setGroupName('');
      setMemberNames(['']);
      setAutoDelete(false);
      setDeleteAfter('immediately');
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#0f0f1a] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300/70">Create group</p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Build the room</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Add members and start splitting expenses in a dark premium workspace.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"
          >
            <X className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="dark-card rounded-[28px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-medium tracking-tight text-white">Tip</p>
                  <p className="text-sm text-slate-400">Use real names so balances stay easy to track.</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Add at least 1 member</li>
                <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">You can edit group expenses later</li>
                <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Share code can be generated inside the group</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="dark-card overflow-hidden rounded-[28px]">
              <div className="border-b border-white/10 px-6 py-5">
                <h3 className="font-display text-lg font-semibold tracking-tight text-white">Group details</h3>
                <p className="mt-1 text-sm text-slate-400">Create a group and invite your friends.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Group name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                    placeholder="Trip to Chennai"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-300">Members</label>
                    <button
                      type="button"
                      onClick={addMemberField}
                      className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/15"
                    >
                      <Plus className="h-4 w-4" />
                      Add member
                    </button>
                  </div>

                  <div className="space-y-3">
                    {memberNames.map((name, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateMemberName(index, e.target.value)}
                          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                          placeholder={`Member ${index + 1} name`}
                        />
                        {memberNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberField(index)}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                            aria-label="Remove member"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-200">
                    <input
                      type="checkbox"
                      checked={autoDelete}
                      onChange={(e) => setAutoDelete(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-violet-500 focus:ring-violet-500/30"
                    />
                    Auto-delete group when all expenses are settled
                  </label>

                  {autoDelete && (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm text-slate-300">Delete after</label>
                      <select
                        value={deleteAfter}
                        onChange={(e) => setDeleteAfter(e.target.value as 'immediately' | '1-day' | '3-days' | '7-days')}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                      >
                        <option value="immediately">Immediately</option>
                        <option value="1-day">1 day</option>
                        <option value="3-days">3 days</option>
                        <option value="7-days">7 days</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? 'Creating…' : 'Create group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

