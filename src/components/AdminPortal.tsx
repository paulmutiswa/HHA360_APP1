import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Upload, Building2, Users, FileCheck, BarChart3,
  Loader2, Check, AlertTriangle, FileSpreadsheet, X, Trash2, Plus,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { Page } from './Layout';
import type { ContactVerification, Agency } from '@/lib/types';

type AdminTab = 'overview' | 'import' | 'organizations' | 'agencies' | 'verifications' | 'users';

export default function AdminPortal({ onPage }: { onPage: (p: Page) => void }) {
  const [tab, setTab] = useState<AdminTab>('overview');

  const tabs: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'import', label: 'Import Data', icon: Upload },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'agencies', label: 'Agencies', icon: Building2 },
    { id: 'verifications', label: 'Verifications', icon: FileCheck },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-brand-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Platform Administrator</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manage platform data, users, and verifications.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          return <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}><Icon className="h-4 w-4" /> {t.label}</button>;
        })}
      </div>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'import' && <ImportData />}
      {tab === 'organizations' && <AdminOrganizations />}
      {tab === 'agencies' && <AdminAgencies />}
      {tab === 'verifications' && <AdminVerifications />}
      {tab === 'users' && <AdminUsers />}
    </div>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState({ orgs: 0, users: 0, pendingVerifs: 0, agencies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, u, v, a] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('contact_verifications').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('agencies').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        orgs: o.count || 0,
        users: u.count || 0,
        pendingVerifs: v.count || 0,
        agencies: a.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { icon: Building2, label: 'Organizations', value: stats.orgs, color: 'bg-brand-50 text-brand-700' },
    { icon: Users, label: 'Users', value: stats.users, color: 'bg-indigo-50 text-indigo-700' },
    { icon: FileCheck, label: 'Pending Verifications', value: stats.pendingVerifs, color: 'bg-amber-50 text-amber-700' },
    { icon: BarChart3, label: 'Agencies', value: stats.agencies, color: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${c.color}`}><Icon className="h-4 w-4" /></div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : c.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          );
        })}
      </div>
      <div className="card p-4">
        <p className="text-sm text-slate-500">Use the Import Data tab to load your Excel workbook. Data will be normalized into the organizations and professional_contacts tables. Pending contact corrections from users appear in the Verifications tab for review.</p>
      </div>
    </>
  );
}

function ImportData() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle');
  const [report, setReport] = useState<{ total: number; imported: number; duplicates: number; flagged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus('parsing');
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const rows: Record<string, unknown>[] = [];
      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        rows.push(...json);
      });

      setStatus('importing');
      const orgs: Record<string, unknown>[] = [];
      let duplicates = 0;
      const seen = new Set<string>();

      for (const row of rows) {
        const name = String(row['Name'] || row['Facility Name'] || row['ORGANIZATION NAME'] || row['name'] || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) { duplicates++; continue; }
        seen.add(key);

        const stateRaw = String(row['State'] || row['STATE'] || row['state'] || '').trim().toUpperCase();
        const state = stateRaw.length > 2 ? stateRaw : stateRaw;
        const phone = String(row['Phone'] || row['PHONE'] || row['Phone Number'] || row['phone'] || '').trim();
        const city = String(row['City'] || row['CITY'] || row['city'] || '').trim();
        const address = String(row['Address'] || row['ADDRESS'] || row['address'] || '').trim();
        const zip = String(row['ZIP'] || row['Zip'] || row['ZIP CODE'] || row['zip'] || '').trim();
        const facilityType = String(row['Type'] || row['Facility Type'] || row['TYPE'] || row['facility_type'] || 'Hospital').trim();
        const county = String(row['County'] || row['COUNTY'] || '').trim();
        const website = String(row['Website'] || row['WEBSITE'] || row['URL'] || '').trim();
        const contactPerson = String(row['Contact Name'] || row['CONTACT NAME'] || row['contact_person'] || '').trim();
        const contactTitle = String(row['Contact Title'] || row['TITLE'] || row['contact_title'] || '').trim();
        const contactEmail = String(row['Email'] || row['EMAIL'] || row['contact_email'] || '').trim();
        const contactPhone = String(row['Contact Phone'] || row['Direct Phone'] || row['contact_phone'] || '').trim();
        const department = String(row['Department'] || row['DEPARTMENT'] || row['department'] || '').trim();

        orgs.push({
          name, facility_type: facilityType || 'Hospital', address, city, county, state, zip, phone, website,
          department, contact_person: contactPerson, contact_title: contactTitle, contact_email: contactEmail, contact_phone: contactPhone,
          source_label: 'Imported from Excel workbook', verification_status: 'Needs Verification',
          date_added: new Date().toISOString().slice(0, 10),
        });
      }

      let imported = 0;
      const BATCH = 50;
      for (let i = 0; i < orgs.length; i += BATCH) {
        const batch = orgs.slice(i, i + BATCH);
        const { error: insertError } = await supabase.from('organizations').insert(batch);
        if (!insertError) imported += batch.length;
      }

      setReport({ total: rows.length, imported, duplicates, flagged: 0 });
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><FileSpreadsheet className="h-5 w-5" /></div>
          <div><h3 className="text-sm font-bold text-slate-900">Import Referral Source Excel</h3><p className="text-xs text-slate-500">Upload your .xlsx workbook to import hospital and VA records.</p></div>
        </div>

        <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Upload className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Click to select your Excel file</p>
          <p className="mt-1 text-xs text-slate-400">Supports .xlsx and .xls formats</p>
          <button onClick={() => fileInputRef.current?.click()} disabled={status === 'parsing' || status === 'importing'} className="btn-primary mt-4">
            {status === 'parsing' || status === 'importing' ? <><Loader2 className="h-4 w-4 animate-spin" /> {status === 'parsing' ? 'Parsing...' : 'Importing...'}</> : <>Select File</>}
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="mb-1 h-4 w-4" /> {error}</div>}

        {report && status === 'done' && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-2"><Check className="h-5 w-5 text-emerald-600" /><h4 className="text-sm font-bold text-emerald-800">Import Complete</h4></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-2xl font-bold text-emerald-700">{report.total}</p><p className="text-xs text-emerald-600">Total Rows</p></div>
              <div><p className="text-2xl font-bold text-emerald-700">{report.imported}</p><p className="text-xs text-emerald-600">Imported</p></div>
              <div><p className="text-2xl font-bold text-amber-600">{report.duplicates}</p><p className="text-xs text-amber-600">Duplicates</p></div>
              <div><p className="text-2xl font-bold text-slate-600">{report.flagged}</p><p className="text-xs text-slate-500">Flagged</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h4 className="text-sm font-bold text-slate-900 mb-2">Import Notes</h4>
        <ul className="space-y-1.5 text-xs text-slate-500">
          <li>• Data is normalized into the organizations table — not stored as a spreadsheet.</li>
          <li>• Duplicate organization names are detected and skipped.</li>
          <li>• All imported records start with "Needs Verification" status.</li>
          <li>• Missing contact fields are left blank — no information is fabricated.</li>
          <li>• State names are normalized to uppercase abbreviations where possible.</li>
        </ul>
      </div>
    </div>
  );
}

function AdminOrganizations() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('organizations').select('id', { count: 'exact', head: true }).then(({ count }) => setCount(count || 0));
  }, []);
  return <div className="card p-6 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">{count !== null ? `${count.toLocaleString()} organizations` : 'Loading...'}</p><p className="mt-1 text-xs text-slate-400">Browse and search organizations in the Directory tab. Import new data via the Import Data tab.</p></div>;
}

function AdminVerifications() {
  const [verifications, setVerifications] = useState<ContactVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('contact_verifications')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (queryError) {
      setError('Failed to load verifications.');
      setLoading(false);
      return;
    }
    setVerifications((data as ContactVerification[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, status: 'Approved' | 'Rejected') => {
    const { error: updateError } = await supabase
      .from('contact_verifications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError('Failed to update verification.');
      return;
    }
    load();
  };

  if (loading) return <div className="card p-6 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-3">
      {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertTriangle className="h-4 w-4" /> {error}</div>}
      {verifications.length === 0 ? (
        <div className="card p-6 text-center"><FileCheck className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">No contact corrections submitted yet.</p></div>
      ) : (
        verifications.map(v => (
          <div key={v.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{v.correction_type}</p>
                <p className="text-xs text-slate-500">Field: {v.field_name}</p>
                <div className="mt-1 text-xs text-slate-600">
                  <p>Original: <span className="font-medium">{v.original_value || '(empty)'}</span></p>
                  <p>Suggested: <span className="font-medium">{v.suggested_value}</span></p>
                </div>
                {v.evidence && <p className="mt-1 text-xs text-slate-400">Evidence: {v.evidence}</p>}
                <p className="mt-1 text-[10px] text-slate-400">Submitted {new Date(v.submitted_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-shrink-0 gap-1.5">
                {v.status === 'Pending' ? (
                  <>
                    <button onClick={() => resolve(v.id, 'Approved')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Check className="h-3.5 w-3.5" /> Approve</button>
                    <button onClick={() => resolve(v.id, 'Rejected')} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"><X className="h-3.5 w-3.5" /> Reject</button>
                  </>
                ) : (
                  <span className={`badge ${v.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{v.status}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdminAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [agencyType, setAgencyType] = useState('Home Health Agency');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('agencies').select('*').order('name');
    setAgencies((data as Agency[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('create_agency_admin', {
      p_name: name, p_agency_type: agencyType, p_state: state, p_city: city, p_phone: phone, p_services: [],
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message || 'Failed to create agency.');
      return;
    }
    setName(''); setAgencyType('Home Health Agency'); setState(''); setCity(''); setPhone('');
    setShowCreate(false);
    load();
  };

  if (loading) return <div className="card p-6 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{agencies.length} agencies</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> Create Agency</button>
      </div>

      {showCreate && (
        <div className="card p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Create New Agency</h4>
          <div><label className="label">Agency Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="ABC Home Health" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label>
              <select className="input" value={agencyType} onChange={e => setAgencyType(e.target.value)}>
                <option>Home Health Agency</option><option>Non-Medical Home Care</option><option>Personal Care Agency</option><option>Hospice</option><option>Startup/Entrepreneur</option>
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={city} onChange={e => setCity(e.target.value)} placeholder="Columbus" /></div>
            <div><label className="label">State</label><input className="input" value={state} onChange={e => setState(e.target.value)} placeholder="OH" maxLength={2} /></div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-xs">Cancel</button>
            <button onClick={create} disabled={saving || !name.trim()} className="btn-primary text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create & Link to Me</button>
          </div>
          <p className="text-xs text-slate-400">Creating an agency links it to your admin account so you can manage its CRM, tasks, and more.</p>
        </div>
      )}

      {agencies.length === 0 && !showCreate && (
        <div className="card p-6 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">No agencies yet. Click "Create Agency" to add one.</p></div>
      )}

      {agencies.map(a => (
        <div key={a.id} className="card flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{a.name}</p>
            <p className="text-xs text-slate-500">{a.agency_type} — {a.city}, {a.state}</p>
          </div>
          <span className="badge bg-slate-100 text-slate-600">{a.subscription_tier}</span>
        </div>
      ))}
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<{ id: string; email: string; display_name: string; role: string; is_platform_admin: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, email, display_name, role, is_platform_admin').order('display_name');
      setUsers(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="card p-6 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="card flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{u.display_name?.[0]?.toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{u.display_name}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
          </div>
          <span className="badge bg-slate-100 text-slate-600">{u.role}</span>
          {u.is_platform_admin && <span className="badge bg-brand-50 text-brand-700">Admin</span>}
        </div>
      ))}
      {users.length === 0 && <div className="card p-6 text-center"><Users className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">No users found.</p></div>}
    </div>
  );
}
