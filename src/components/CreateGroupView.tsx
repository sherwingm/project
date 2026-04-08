import { useMemo, useState } from 'react';
import { Plus, Users, X } from 'lucide-react';

interface CreateGroupViewProps {
  onCreateGroup: (name: string, members: string[]) => Promise<void> | void;
  onCancel: () => void;
}

export function CreateGroupView({ onCreateGroup, onCancel }: CreateGroupViewProps) {
  const [groupName, setGroupName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>(['']);
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
      await onCreateGroup(groupName.trim(), validMembers);
      setGroupName('');
      setMemberNames(['']);
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('/images/yy.jpg')" }}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/85 to-purple-600/75" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold">Create Group</h2>
              <p className="text-white/90 mt-2">Add members and start splitting expenses in seconds.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/10 border border-white/20 p-6 text-white backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Tip</p>
                    <p className="text-sm text-white/90">Use real names so balances are easy to track.</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-white/90">
                  <li>- Add at least 1 member</li>
                  <li>- You can edit group expenses later</li>
                  <li>- Share code can be generated inside the group</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-white/40 shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Group details</h3>
                  <p className="text-sm text-gray-600 mt-1">Create a group and invite your friends.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Group name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Trip to Chennai"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Members</label>
                      <button
                        type="button"
                        onClick={addMemberField}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
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
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            placeholder={`Member ${index + 1} name`}
                          />
                          {memberNames.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMemberField(index)}
                              className="h-11 w-11 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center"
                              aria-label="Remove member"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  );
}

