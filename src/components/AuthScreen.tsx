import { useState } from 'react';
import { Mail, Lock, User, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Step = 'form' | 'verify';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (mode === 'signin') {
      setLoading(true);
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
      setLoading(false);
      return;
    }

    // Sign-up: send activation code
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-activation-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email, fullName, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send activation code');
      } else {
        setStep('verify');
        setInfoMessage(`We sent a 6-digit activation code to ${email}. Check your inbox and enter it below.`);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-activation-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email, code: activationCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid or expired code');
        setLoading(false);
        return;
      }
      // Account activated — auto sign-in
      const result = await signIn(email, password);
      if (result.error) {
        setError('Account activated! Please sign in with your email and password.');
        setMode('signin');
        setStep('form');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setStep('form');
    setError(null);
    setInfoMessage(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/Ref_Hub_logo.png" alt="HHA360" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-contain shadow-lg" />
          <h1 className="text-2xl font-bold text-slate-900">HHA360</h1>
          <p className="mt-1 text-sm text-slate-500">Start. Operate. Connect. Grow.</p>
        </div>

        {step === 'verify' ? (
          <div className="card p-6">
            <button
              onClick={() => { setStep('form'); setError(null); }}
              className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="mb-1 text-lg font-bold text-slate-900">Activate Your Account</h2>
            {infoMessage && <p className="mb-4 text-sm text-slate-500">{infoMessage}</p>}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label">Activation Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input pl-9 text-center text-2xl tracking-[0.5em] font-bold"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

              <button type="submit" disabled={loading || activationCode.length !== 6} className="btn-primary w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate Account'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              Didn't get the code? Check your spam folder, or{' '}
              <button onClick={() => { setStep('form'); setActivationCode(''); }} className="text-brand-600 font-medium hover:underline">
                go back and try again
              </button>
            </p>
          </div>
        ) : (
          <div className="card p-6">
            <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
              >Sign In</button>
              <button
                onClick={() => switchMode('signup')}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
              >Create Account</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required />
                  </div>
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="password" className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
              </div>

              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              {infoMessage && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoMessage}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {mode === 'signup' && (
              <p className="mt-4 text-center text-xs text-slate-400">
                You'll receive a 6-digit code by email to activate your account.
              </p>
            )}
            <p className="mt-4 text-center text-xs text-slate-400">
              By continuing you agree to HHA360's terms and privacy policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
