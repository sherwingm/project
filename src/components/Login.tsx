import { useState } from 'react';
import { Mail, Lock, Phone, User } from 'lucide-react';
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
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loginEmail = email.trim();
      const loginPhone = phone.trim();
      if ((!loginEmail && !loginPhone) || !password) {
        setError('Enter email or phone and password');
        setLoading(false);
        return;
      }
      await login(loginEmail, loginPhone, password);
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const signUpEmail = email.trim();
      const signUpPhoneVal = signUpPhone.trim();
      if (!name || !signUpEmail || !password || password !== confirmPassword) {
        setError('Please fill all fields and make sure passwords match');
        setLoading(false);
        return;
      }
      await register(name, signUpEmail, signUpPhoneVal, password);
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    setError('');
    setEmail(''); setPhone(''); setPassword('');
    setName(''); setSignUpPhone(''); setConfirmPassword('');
  };

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: "url('/images/yy.jpg')" }}
    >
      {/* Dark overlay on background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-3xl p-8 shadow-2xl border border-white/10"
          style={{ background: 'rgba(15, 15, 30, 0.92)', backdropFilter: 'blur(24px)' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <NewLogo size="lg" />
            </div>
            {/* App name — explicit visible text fallback */}
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
              Budget Split Expenser
            </h1>
            <p className="text-slate-400 text-sm">Split expenses with friends, effortlessly</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => switchTab(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                !isSignUp
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => switchTab(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isSignUp
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Input style helper */}
          <style>{`
            .auth-input {
              width: 100%;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 12px;
              padding: 11px 16px 11px 42px;
              color: #f1f5f9;
              font-size: 14px;
              outline: none;
              transition: border-color 0.2s, box-shadow 0.2s;
            }
            .auth-input::placeholder { color: #64748b; }
            .auth-input:focus {
              border-color: #7c3aed;
              box-shadow: 0 0 0 3px rgba(124,58,237,0.2);
            }
            .auth-label {
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              margin-bottom: 8px;
              letter-spacing: 0.05em;
              text-transform: uppercase;
            }
            .input-wrap { position: relative; }
            .input-icon {
              position: absolute;
              left: 13px;
              top: 50%;
              transform: translateY(-50%);
              color: #64748b;
              width: 16px;
              height: 16px;
            }
          `}</style>

          {/* LOGIN FORM */}
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
                      const v = e.target.value;
                      if (/^[\d\s+\-()]*$/.test(v) && v !== '') {
                        setPhone(v); setEmail('');
                      } else {
                        setEmail(v); setPhone('');
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
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.4)'
                }}
              >
                {loading ? 'Logging in...' : 'Login →'}
              </button>
            </form>

          ) : (
            /* SIGN UP FORM */
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
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.4)'
                }}
              >
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                By signing up you agree to our Terms & Privacy Policy
              </p>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/8 text-center">
            <p className="text-xs text-slate-600">© 2026 Budget Split Expenser. All rights reserved.</p>
          </div>
        </div>

        {/* Below card tagline */}
        <p className="text-center text-white/50 text-sm mt-4">
          Track expenses · Split bills · Settle debts
        </p>
      </div>
    </div>
  );
}
