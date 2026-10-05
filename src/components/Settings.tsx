import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Agency } from '@/lib/types';

export default function Settings() {
  const { profile, agency, refresh } = useAuth();
  const [form, setForm] = useState<Agency | null>(agency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(agency); }, [agency]);

  const save = async () => {
    if (!form || !agency) return;
    setSaving(true);
    await supabase.from('agencies').update({
      name: form.name, phone: form.phone, website: form.website, address: form.address,
      city: form.city, state: form.state, zip: form.zip,
      services: form.services, service_radius_miles: form.service_radius_miles,
      max_capacity: form.max_capacity, current_capacity: form.current_capacity,
      medicare_certified: form.medicare_certified, medicaid_provider: form.medicaid_provider, private_pay: form.private_pay,
    }).eq('id', agency.id);
    await refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return <p className="text-sm text-slate-400">No agency found.</p>;

  const SERVICES = ['Skilled Nursing', 'Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'Personal Care', 'Homemaking', 'Companion Care', 'Respite Care', 'Medication Management'];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-brand-600" />
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Settings</h2>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4 text-brand-600" /> Agency Information</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Agency Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Website</label><input className="input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          <div><label className="label">State</label><input className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
          <div><label className="label">ZIP</label><input className="input" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
          <div><label className="label">Service Radius (miles)</label><input type="number" className="input" value={form.service_radius_miles} onChange={e => setForm({ ...form, service_radius_miles: Number(e.target.value) })} /></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold">Services</h3>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(s => {
            const active = form.services.includes(s);
            return <button key={s} onClick={() => setForm({ ...form, services: active ? form.services.filter(x => x !== s) : [...form.services, s] })} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s}</button>;
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold">Certifications & Capacity</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.medicare_certified} onChange={e => setForm({ ...form, medicare_certified: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Medicare Certified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.medicaid_provider} onChange={e => setForm({ ...form, medicaid_provider: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Medicaid Provider</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.private_pay} onChange={e => setForm({ ...form, private_pay: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" /> Private Pay</label>
          <div><label className="label">Max Capacity</label><input type="number" className="input" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: Number(e.target.value) })} /></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold">Subscription</h3>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold text-slate-900">{form.subscription_tier}</p><p className="text-xs text-slate-500">Current plan</p></div>
          <span className="badge bg-brand-50 text-brand-700">Manage in Admin Portal</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}</button>
        {saved && <span className="text-sm text-emerald-600">Saved!</span>}
      </div>

      <div className="text-xs text-slate-400">Signed in as {profile?.email} — Role: {profile?.role}</div>
    </div>
  );
}
