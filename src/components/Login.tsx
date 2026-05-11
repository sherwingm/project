import { useState, type FormEvent } from 'react';
import { ArrowRight, BadgeIndianRupee, Check, Lock, Mail, Phone, ShieldCheck, Sparkles, User } from 'lucide-react';
import { NewLogo } from './NewLogo';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginEmail = email.trim();
      const loginPhone = phone.trim();

      if ((!loginEmail && !loginPhone) || !password) {
        setError('Enter email or phone and password');
        return;
      }

      await login(loginEmail, loginPhone, password);
    } catch (loginError: any) {
      setError(loginError.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signUpEmail = email.trim();
      const signUpPhoneValue = signUpPhone.trim();

      if (!name || !signUpEmail || !password || password !== confirmPassword) {
        setError('Please fill all fields and make sure passwords match');
        return;
      }

      await register(name, signUpEmail, signUpPhoneValue, password, upiId.trim());
    } catch (registerError: any) {
      setError(registerError.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    setError('');
    setEmail('');
    setPhone('');
    setPassword('');
    setName('');
    setSignUpPhone('');
    setUpiId('');
    setConfirmPassword('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(6,8,22,0.96),rgba(12,14,30,0.96)),radial-gradient(circle_at_15%_20%,rgba(6,182,212,0.25),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(124,58,237,0.34),transparent_34%),radial-gradient(circle_at_78%_86%,rgba(16,185,129,0.2),transparent_26%)]" />
      <div className="absolute inset-0 app-grid-overlay opacity-30" />
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute right-16 top-24 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <aside className="hidden min-h-screen flex-col justify-between px-8 py-8 lg:flex">
          <NewLogo size="lg" />

          <div className="max-w-3xl space-y-8 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 shadow-[0_10px_30px_rgba(34,211,238,0.15)]">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Budget Split Expenser
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-6xl font-extrabold leading-tight tracking-tight text-white [text-shadow:0_8px_40px_rgba(147,197,253,0.22)]">
                The smarter way to split bills
              </h1>
              <p className="max-w-2xl text-lg text-slate-300">
                Track expenses, settle debts, and pay instantly with UPI.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-sm font-semibold text-fuchsia-100">10k+ splits</span>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">UPI payments</span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">Zero fees</span>
            </div>

            <div className="max-w-xl rounded-2xl border border-white/12 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <p className="text-sm leading-6 text-slate-400">
                “The cleanest bill splitting flow we’ve used. Settlements feel immediate and the UPI handoff is smooth.”
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">Priya, product lead</p>
                  <p className="text-xs text-slate-500">Trusted for group trips and shared homes</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-0 lg:py-0">
          <div className="relative w-full max-w-xl rounded-3xl border border-cyan-400/25 bg-[linear-gradient(165deg,rgba(15,20,45,0.94),rgba(8,12,32,0.97))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.18),transparent_32%)]" />
            <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <NewLogo size="lg" />
              <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">UPI ready</div>
            </div>

            <div className="relative mb-6 flex rounded-2xl border border-white/12 bg-white/5 p-1">
              <button
                onClick={() => switchTab(false)}
                className={`h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                  !isSignUp ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => switchTab(true)}
                className={`h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                  isSignUp ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <style>{`
              .auth-input {
                width: 100%;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(148, 163, 184, 0.25);
                border-radius: 18px;
                padding: 13px 16px 13px 44px;
                color: #f1f5f9;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
              }
              .auth-input::placeholder { color: #64748b; }
              .auth-input:focus {
                border-color: #22d3ee;
                box-shadow: 0 0 0 3px rgba(34,211,238,0.22), 0 12px 30px rgba(6,182,212,0.18);
                transform: translateY(-1px);
              }
              .auth-label {
                display: block;
                font-size: 12px;
                font-weight: 700;
                color: #94a3b8;
                margin-bottom: 8px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
              }
              .input-wrap { position: relative; }
              .input-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: #94a3b8;
                width: 16px;
                height: 16px;
              }
            `}</style>

            {!isSignUp ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="auth-label">Email or Phone</label>
                  <div className="input-wrap">
                    <Mail className="input-icon" />
                    <input
                      type="text"
                      value={email || phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^[\d\s+\-()]*$/.test(value) && value !== '') {
                          setPhone(value);
                          setEmail('');
                        } else {
                          setEmail(value);
                          setPhone('');
                        }
                      }}
                      className="auth-input"
                      placeholder="you@example.com or 9876543210"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Password</label>
                  <div className="input-wrap">
                    <Lock className="input-icon" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(99,102,241,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Logging in...' : 'Login'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="auth-label">Full Name</label>
                  <div className="input-wrap">
                    <User className="input-icon" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="auth-input"
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Email</label>
                  <div className="input-wrap">
                    <Mail className="input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Phone Number <span className="normal-case text-slate-500">(optional)</span></label>
                  <div className="input-wrap">
                    <Phone className="input-icon" />
                    <input
                      type="tel"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      className="auth-input"
                      placeholder="9876543210"
                      maxLength={15}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">UPI ID <span className="normal-case text-slate-500">(optional)</span></label>
                  <div className="input-wrap">
                    <BadgeIndianRupee className="input-icon" />
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="auth-input"
                      placeholder="name@okicici or 9876543210@ybl"
                      autoComplete="off"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">@okicici · @ybl · @paytm · @upi</p>
                </div>

                <div>
                  <label className="auth-label">Password</label>
                  <div className="input-wrap">
                    <Lock className="input-icon" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Create a password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Confirm Password</label>
                  <div className="input-wrap">
                    <Lock className="input-icon" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(99,102,241,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="text-center text-xs text-slate-500">
                  By signing up you agree to our Terms & Privacy Policy
                </p>
              </form>
            )}

            <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Secure invite-based splitting
              </span>
              <span>© 2026 Budget Split Expenser</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
