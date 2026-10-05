import { useState } from 'react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('shenjerepaul@gmail.com');
  const [password, setPassword] = useState('Shenjere@#11');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/Ref_Hub_logo.png" alt="HHA360" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-contain shadow-lg" />
          <h1 className="text-2xl font-bold text-slate-900">HHA360</h1>
          <p className="mt-1 text-sm text-slate-500">Start. Operate. Connect. Grow.</p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            >Sign In</button>
            <button
              onClick={() => setMode('signup')}
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

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            By continuing you agree to HHA360's terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
