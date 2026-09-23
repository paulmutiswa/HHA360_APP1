import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Save, Trash2, UserCog, AlertCircle, CheckCircle2, Clock, FileWarning } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Employee, EmployeeCredential } from '@/lib/types';

const CREDENTIAL_TYPES = ['CPR', 'First Aid', 'Bloodborne Pathogens', 'CNA', 'HHA', 'RN', 'LPN', 'Driver License', 'Background Check', 'TB Test', 'Orientation', 'Training', 'Other'];

export default function Employees() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<(Employee & { credentials?: EmployeeCredential[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<(Employee & { credentials?: EmployeeCredential[] }) | null>(null);

  const load = useCallback(async () => {
    if (!profile?.agency_id) return;
    const { data: emps } = await supabase.from('employees').select('*').eq('agency_id', profile.agency_id).order('full_name');
    const { data: creds } = await supabase.from('employee_credentials').select('*').eq('agency_id', profile.agency_id);
    const credMap = (creds || []).reduce((acc, c) => { (acc[c.employee_id] = acc[c.employee_id] || []).push(c); return acc; }, {} as Record<string, EmployeeCredential[]>);
    setEmployees((emps || []).map(e => ({ ...e, credentials: credMap[e.id] || [] })));
    setLoading(false);
  }, [profile?.agency_id]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const in30 = new Date(Date.now() + 30 * 86400000);
  const in90 = new Date(Date.now() + 90 * 86400000);

  const credStatus = (c: EmployeeCredential) => {
    if (!c.expiration_date) return 'none';
    const exp = new Date(c.expiration_date + 'T00:00');
    if (exp < today) return 'expired';
    if (exp < in30) return 'expiring30';
    if (exp < in90) return 'expiring90';
    return 'valid';
  };

  const stats = {
    total: employees.length,
    compliant: employees.filter(e => e.credentials?.every(c => credStatus(c) === 'valid' || credStatus(c) === 'none')).length,
    expiring: employees.filter(e => e.credentials?.some(c => ['expiring30', 'expiring90'].includes(credStatus(c)))).length,
    expired: employees.filter(e => e.credentials?.some(c => credStatus(c) === 'expired')).length,
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Employees</h2>
          <p className="mt-1 text-sm text-slate-500">Track caregiver compliance and credentials.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Employee</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><UserCog className="h-4 w-4" /></div><p className="mt-2 text-xl font-bold">{stats.total}</p><p className="text-xs text-slate-500">Total</p></div>
        <div className="card p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></div><p className="mt-2 text-xl font-bold">{stats.compliant}</p><p className="text-xs text-slate-500">Compliant</p></div>
        <div className="card p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Clock className="h-4 w-4" /></div><p className="mt-2 text-xl font-bold">{stats.expiring}</p><p className="text-xs text-slate-500">Expiring Soon</p></div>
        <div className="card p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><FileWarning className="h-4 w-4" /></div><p className="mt-2 text-xl font-bold">{stats.expired}</p><p className="text-xs text-slate-500">Expired</p></div>
      </div>

      {loading && <p className="py-12 text-center text-sm text-slate-400">Loading...</p>}
      {!loading && employees.length === 0 && (
        <div className="card p-12 text-center"><UserCog className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">No employees yet</p><p className="mt-1 text-xs text-slate-400">Add caregivers and track their compliance documents.</p></div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map(e => {
          const hasExpired = e.credentials?.some(c => credStatus(c) === 'expired');
          const hasExpiring = e.credentials?.some(c => ['expiring30', 'expiring90'].includes(credStatus(c)));
          return (
            <button key={e.id} onClick={() => setSelected(e)} className="card group p-4 text-left transition-all hover:shadow-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{e.full_name[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-brand-700">{e.full_name}</p>
                    <p className="text-xs text-slate-500">{e.role}</p>
                  </div>
                </div>
                {hasExpired ? <span className="badge bg-rose-50 text-rose-700"><AlertCircle className="h-3 w-3" /> Expired</span>
                 : hasExpiring ? <span className="badge bg-amber-50 text-amber-700"><Clock className="h-3 w-3" /> Expiring</span>
                 : <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Compliant</span>}
              </div>
              {e.credentials && e.credentials.length > 0 && <p className="mt-2 text-xs text-slate-400">{e.credentials.length} credential(s) tracked</p>}
            </button>
          );
        })}
      </div>

      {showAdd && <AddEmployeeModal agencyId={profile!.agency_id!} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {selected && <EmployeeDetail employee={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

function AddEmployeeModal({ agencyId, onClose, onSaved }: { agencyId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Caregiver');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hireDate, setHireDate] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    await supabase.from('employees').insert({ agency_id: agencyId, full_name: name.trim(), role, phone, email, hire_date: hireDate || null });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-bold">Add Employee</h2><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-3 px-5 py-4">
          <div><label className="label">Full Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="label">Role</label><select className="input" value={role} onChange={e => setRole(e.target.value)}><option>Caregiver</option><option>CNA</option><option>HHA</option><option>RN</option><option>LPN</option><option>Coordinator</option><option>Administrator</option></select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div><label className="label">Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div><label className="label">Hire Date</label><input type="date" className="input" value={hireDate} onChange={e => setHireDate(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button onClick={onClose} className="btn-ghost">Cancel</button><button onClick={save} className="btn-primary"><Save className="h-4 w-4" /> Save</button></div>
      </div>
    </div>
  );
}

function EmployeeDetail({ employee, onClose, onUpdate }: { employee: Employee & { credentials?: EmployeeCredential[] }; onClose: () => void; onUpdate: () => void }) {
  const { profile } = useAuth();
  const [creds, setCreds] = useState<EmployeeCredential[]>(employee.credentials || []);
  const [showAddCred, setShowAddCred] = useState(false);

  const today = new Date();
  const statusColor: Record<string, string> = { valid: 'bg-emerald-50 text-emerald-700', expiring90: 'bg-amber-50 text-amber-700', expiring30: 'bg-orange-50 text-orange-700', expired: 'bg-rose-50 text-rose-700', none: 'bg-slate-100 text-slate-600' };

  const credStatus = (c: EmployeeCredential) => {
    if (!c.expiration_date) return 'none';
    const exp = new Date(c.expiration_date + 'T00:00');
    if (exp < today) return 'expired';
    if (exp < new Date(Date.now() + 30 * 86400000)) return 'expiring30';
    if (exp < new Date(Date.now() + 90 * 86400000)) return 'expiring90';
    return 'valid';
  };

  const addCred = async (type: string, issue: string, exp: string) => {
    await supabase.from('employee_credentials').insert({ employee_id: employee.id, agency_id: profile!.agency_id!, credential_type: type, issue_date: issue || null, expiration_date: exp || null });
    const { data } = await supabase.from('employee_credentials').select('*').eq('employee_id', employee.id);
    setCreds((data as EmployeeCredential[]) || []);
    setShowAddCred(false);
    onUpdate();
  };

  const delCred = async (id: string) => {
    await supabase.from('employee_credentials').delete().eq('id', id);
    setCreds(creds.filter(c => c.id !== id));
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-slate-50 shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div><h2 className="text-lg font-bold">{employee.full_name}</h2><p className="text-xs text-slate-500">{employee.role}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold">Credentials</h3><button onClick={() => setShowAddCred(true)} className="btn-ghost text-xs"><Plus className="h-3.5 w-3.5" /> Add</button></div>
            <div className="space-y-2">
              {creds.length === 0 && <p className="text-xs text-slate-400 py-2">No credentials tracked.</p>}
              {creds.map(c => (
                <div key={c.id} className="group flex items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{c.credential_type}</p>
                    {c.expiration_date && <p className="text-xs text-slate-500">Expires: {new Date(c.expiration_date + 'T00:00').toLocaleDateString()}</p>}
                  </div>
                  <span className={`badge ${statusColor[credStatus(c)]}`}>{credStatus(c) === 'none' ? 'No expiry' : credStatus(c)}</span>
                  <button onClick={() => delCred(c.id)} className="rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
          {showAddCred && <AddCredForm types={CREDENTIAL_TYPES} onAdd={addCred} onCancel={() => setShowAddCred(false)} />}
        </div>
      </div>
    </div>
  );
}

function AddCredForm({ types, onAdd, onCancel }: { types: string[]; onAdd: (type: string, issue: string, exp: string) => void; onCancel: () => void }) {
  const [type, setType] = useState('CPR');
  const [issue, setIssue] = useState('');
  const [exp, setExp] = useState('');
  return (
    <div className="card p-4">
      <h4 className="mb-3 text-sm font-bold">Add Credential</h4>
      <div className="space-y-3">
        <div><label className="label">Type</label><select className="input" value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Issue Date</label><input type="date" className="input" value={issue} onChange={e => setIssue(e.target.value)} /></div>
          <div><label className="label">Expiration</label><input type="date" className="input" value={exp} onChange={e => setExp(e.target.value)} /></div>
        </div>
        <div className="flex gap-2"><button onClick={onCancel} className="btn-ghost flex-1">Cancel</button><button onClick={() => onAdd(type, issue, exp)} className="btn-primary flex-1">Add</button></div>
      </div>
    </div>
  );
}
