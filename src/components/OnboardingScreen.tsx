import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const AGENCY_TYPES = ['Home Health Agency', 'Non-Medical Home Care', 'Personal Care Agency', 'Hospice', 'Startup/Entrepreneur'];
const SERVICES = ['Skilled Nursing', 'Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'Personal Care', 'Homemaking', 'Companion Care', 'Respite Care', 'Medication Management'];
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function OnboardingScreen() {
  const { session, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [agencyType, setAgencyType] = useState('Home Health Agency');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleService = (s: string) => {
    setServices((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleFinish = async () => {
    if (!name.trim()) { setError('Agency name is required.'); return; }
    setError(null);
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('create_agency_onboarding', {
      p_name: name, p_agency_type: agencyType, p_state: state, p_city: city, p_phone: phone, p_services: services,
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    await refresh();
    setLoading(false);
  };

  const steps = ['Agency Basics', 'Location', 'Services'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <img src="/Ref_Hub_logo.png" alt="HHA360" className="mx-auto mb-3 h-12 w-12 rounded-2xl object-contain shadow-lg" />
          <h1 className="text-xl font-bold text-slate-900">Welcome to HHA360</h1>
          <p className="mt-1 text-sm text-slate-500">Let's set up your agency.</p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400'}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-brand-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Agency Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC Home Health" />
              </div>
              <div>
                <label className="label">Agency Type</label>
                <select className="input" value={agencyType} onChange={(e) => setAgencyType(e.target.value)}>
                  {AGENCY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <button onClick={() => setStep(1)} disabled={!name.trim()} className="btn-primary w-full">Continue</button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">City</label>
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Columbus" />
              </div>
              <div>
                <label className="label">State</label>
                <select className="input" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(2)} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">Services Provided</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => (
                    <button key={s} type="button" onClick={() => toggleService(s)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${services.includes(s) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">Signed in as {session?.user?.email}</p>
      </div>
    </div>
  );
}
