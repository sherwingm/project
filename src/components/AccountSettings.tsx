import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, User, Lock, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { isValidUpiId } from '../utils/upi';

interface AccountSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    upiId?: string;
  };
  onBack: () => void;
  onUpdateProfile?: (name: string, upiId: string) => void | Promise<void>;
  onChangePassword?: (oldPassword: string, newPassword: string) => void;
  onDeleteAccount?: () => void;
}

export function AccountSettings({ user, onBack, onUpdateProfile, onChangePassword, onDeleteAccount }: AccountSettingsProps) {
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user.name);
  const [upiId, setUpiId] = useState(user.upiId || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [upiTouched, setUpiTouched] = useState(false);
  const [upiError, setUpiError] = useState('');

  const validateUpi = (value: string) => {
    if (!isValidUpiId(value)) {
      return 'Enter a valid UPI ID (e.g. name@okicici, 9876543210@ybl)';
    }

    return '';
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const freshUser = await apiService.getUserProfile(user.id);
        if (!isMounted) return;

        setDisplayName(freshUser.name || user.name);
        setUpiId(freshUser.upiId || '');
      } catch {
        if (!isMounted) return;
        setDisplayName(user.name);
        setUpiId(user.upiId || '');
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user.id, user.name, user.upiId]);

  const handleUpdateProfile = async () => {
    if (displayName.trim()) {
      const validationError = validateUpi(upiId);
      setUpiTouched(true);
      setUpiError(validationError);

      if (validationError) {
        setMessage(validationError);
        setMessageType('error');
        return;
      }

      await onUpdateProfile?.(displayName, upiId.trim());
      setEditMode(false);
      setMessage('✓ UPI ID saved!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match!');
      setMessageType('error');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters!');
      setMessageType('error');
      return;
    }
    onChangePassword?.(oldPassword, newPassword);
    setMessage('Password changed successfully!');
    setMessageType('success');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      onDeleteAccount?.();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-8 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10">
            <ArrowLeft className="h-6 w-6 text-slate-200" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Account</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Account Settings</h1>
          </div>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl border px-4 py-4 ${messageType === 'success' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}>
            {message}
          </div>
        )}

        <div className="dark-card mb-6 rounded-[28px] p-6">
          <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-semibold text-white">
            <User className="h-5 w-5 text-cyan-300" />
            <span>Profile information</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email Address</label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <Mail className="h-5 w-5 text-slate-500" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="flex-1 bg-transparent text-slate-300 disabled:cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Display Name</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!editMode}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:bg-white/5 disabled:text-slate-400"
                  placeholder="Your name"
                />
                {editMode ? (
                  <div className="flex gap-2">
                    <button onClick={handleUpdateProfile} disabled={!!validateUpi(upiId)} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                    <button onClick={() => { setEditMode(false); setDisplayName(user.name); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditMode(true)} className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 font-medium text-white">Edit</button>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    if (upiTouched) {
                      setUpiError(validateUpi(e.target.value));
                    }
                  }}
                  onBlur={() => {
                    setUpiTouched(true);
                    setUpiError(validateUpi(upiId));
                  }}
                  disabled={!editMode}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:bg-white/5 disabled:text-slate-400"
                  placeholder="name@bank"
                />
                {upiError ? (
                  <p className="mt-1 text-xs text-rose-300">{upiError}</p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-slate-500">Enter a valid UPI ID (e.g. name@okicici, 9876543210@ybl)</p>
                    <p className="mt-1 text-xs text-slate-500">@okicici · @ybl · @paytm · @upi · @okhdfcbank</p>
                  </>
                )}
                <p className="mt-1 text-xs text-slate-500">Used for one-tap UPI settlements</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dark-card mb-6 rounded-[28px] p-6">
          <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-semibold text-white">
            <Lock className="h-5 w-5 text-cyan-300" />
            <span>Security</span>
          </h2>

          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 font-medium text-white"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>

          {showPasswordForm && (
            <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  placeholder="Confirm new password"
                />
              </div>
              <button onClick={handleChangePassword} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-medium text-white">Update Password</button>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-rose-100">
            <Trash2 className="h-5 w-5" />
            <span>Danger Zone</span>
          </h2>
          <p className="mb-4 text-rose-100/80">Deleting your account will remove all your data and cannot be undone.</p>
          <button onClick={handleDeleteAccount} className="rounded-2xl border border-rose-400/20 bg-rose-500/20 px-6 py-3 font-medium text-rose-100 transition hover:bg-rose-500/30">Delete Account</button>
        </div>
      </div>
    </div>
  );
}
