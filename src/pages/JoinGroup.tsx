import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Link2, ShieldAlert, Users } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';

interface JoinGroupProps {
  groupId: string;
  onJoinSuccess: (group: Group) => void;
  onLoginRequested: (invitePath: string) => void;
}

interface InvitePreview {
  id: string;
  groupName: string;
  creatorName: string;
  memberCount: number;
}

export default function JoinGroup({ groupId, onJoinSuccess, onLoginRequested }: JoinGroupProps) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const invitePath = useMemo(() => `/join/${groupId}`, [groupId]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await apiService.getGroupInvitePreview(groupId);
        if (!cancelled) {
          setPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load invite');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handlePrimaryAction = async () => {
    if (!user) {
      localStorage.setItem('pendingJoinUrl', invitePath);
      onLoginRequested(invitePath);
      return;
    }

    try {
      setIsJoining(true);
      setError('');
      const joinedGroup = await apiService.joinGroupById(groupId);
      onJoinSuccess(joinedGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join group');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <div className="dark-card w-full rounded-[32px] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100">
            <Link2 className="h-4 w-4" />
            <span>Invite link</span>
          </div>

          <div className="mt-5 space-y-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {isLoading ? 'Loading invite...' : preview ? `${preview.creatorName} invited you to join ${preview.groupName}` : 'Join the group'}
            </h1>
            <p className="max-w-xl text-sm text-slate-400 sm:text-base">
              This invite lets real members join the group directly. No ghost users, no manual name entry.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Group</p>
              <p className="mt-1 text-lg font-semibold text-white">{preview?.groupName || '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Members</p>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-4 w-4 text-cyan-300" />
                <span>{preview?.memberCount ?? 0}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={isLoading || isJoining}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!user ? 'Login to Join' : isJoining ? 'Joining…' : 'Join Group'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/10"
            >
              Back
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <ShieldAlert className="mr-2 inline-block h-4 w-4" />
            If you are not logged in, we’ll save this invite and bring you back here after login.
          </div>
        </div>
      </div>
    </div>
  );
}