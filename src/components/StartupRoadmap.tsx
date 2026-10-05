import { useEffect, useState, useCallback } from 'react';
import { Rocket, Check, Clock, AlertCircle, Circle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { RoadmapStatus } from '@/lib/types';

const STEPS = [
  { key: 'agency_setup', title: 'Agency Setup', desc: 'Register business, obtain EIN, set up office' },
  { key: 'registration', title: 'Registration', desc: 'Register with Secretary of State, state taxes' },
  { key: 'licensing', title: 'Licensing / Certification', desc: 'Determine and apply for required state license(s)' },
  { key: 'insurance', title: 'Insurance', desc: 'General liability, professional, workers comp' },
  { key: 'policies', title: 'Policies & Procedures', desc: 'Clinical, HR, emergency, HIPAA policies' },
  { key: 'employee_reqs', title: 'Employee Requirements', desc: 'Background checks, training, credentialing' },
  { key: 'training', title: 'Training', desc: 'Orientation, CPR, infection control, HIPAA' },
  { key: 'client_docs', title: 'Client Documents', desc: 'Intake forms, service agreements, care plans' },
  { key: 'marketing', title: 'Marketing', desc: 'Business cards, brochure, website, referral packet' },
  { key: 'referral_readiness', title: 'Referral Readiness', desc: 'Identify referral sources, begin outreach' },
  { key: 'operational', title: 'Operational Readiness', desc: 'Scheduling, billing, phone system, on-call' },
];

const STATUSES: RoadmapStatus[] = ['Not Started', 'In Progress', 'Needs Attention', 'Completed'];

const STATUS_ICON: Record<string, typeof Check> = {
  'Completed': Check, 'In Progress': Clock, 'Needs Attention': AlertCircle, 'Not Started': Circle,
};
const STATUS_COLOR: Record<string, string> = {
  'Completed': 'bg-emerald-50 text-emerald-700', 'In Progress': 'bg-brand-50 text-brand-700',
  'Needs Attention': 'bg-amber-50 text-amber-700', 'Not Started': 'bg-slate-100 text-slate-500',
};

export default function StartupRoadmap() {
  const { profile } = useAuth();
  const [progress, setProgress] = useState<Record<string, RoadmapStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.agency_id) return;
    const { data, error } = await supabase
      .from('roadmap_progress')
      .select('*')
      .eq('agency_id', profile.agency_id);
    if (error) { setLoading(false); return; }
    const map: Record<string, RoadmapStatus> = {};
    (data || []).forEach((r: { step_key: string; status: RoadmapStatus }) => { map[r.step_key] = r.status; });
    setProgress(map);
    setLoading(false);
  }, [profile?.agency_id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (stepKey: string, status: RoadmapStatus) => {
    if (!profile?.agency_id) return;
    setSavingKey(stepKey);
    const { error } = await supabase
      .from('roadmap_progress')
      .upsert({ agency_id: profile.agency_id, step_key: stepKey, status, updated_at: new Date().toISOString() }, { onConflict: 'agency_id,step_key' });
    if (!error) {
      setProgress(prev => ({ ...prev, [stepKey]: status }));
    }
    setSavingKey(null);
  };

  const completed = STEPS.filter(s => (progress[s.key] || 'Not Started') === 'Completed').length;
  const pct = Math.round((completed / STEPS.length) * 100);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-6 w-6 text-brand-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Startup Roadmap</h2>
          <p className="mt-0.5 text-sm text-slate-500">Your personalized agency startup checklist. Progress saves automatically.</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">Overall Progress</h3><span className="text-sm font-bold text-brand-600">{pct}%</span></div>
        <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-slate-400">{completed} of {STEPS.length} steps completed</p>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const status = progress[step.key] || 'Not Started';
          const Icon = STATUS_ICON[status];
          return (
            <div key={step.key} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${STATUS_COLOR[status]}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
                {savingKey === step.key && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(step.key, s)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${status === s ? STATUS_COLOR[s] + ' ring-1 ring-current/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This roadmap is a general guide. Requirements vary by state and agency type. Verify all steps with your state health department.</div>
    </div>
  );
}
