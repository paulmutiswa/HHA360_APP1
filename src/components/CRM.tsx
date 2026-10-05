import { useEffect, useState, useCallback } from 'react';
import {
  Plus, X, Phone, Mail, MapPin, Clock, Users, TrendingUp,
  ChevronRight, Save, Trash2, FileText, Search, UserPlus, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CrmRecord, CrmActivity, Organization, CrmStage, Referral, Profile, Agency } from '@/lib/types';
import { CRM_STAGES } from '@/lib/types';

const STAGE_COLORS: Record<string, string> = {
  'Not Contacted': 'bg-slate-100 text-slate-600',
  'Attempted Contact': 'bg-amber-50 text-amber-700',
  'Contacted': 'bg-brand-50 text-brand-700',
  'Follow-Up Required': 'bg-orange-50 text-orange-700',
  'Relationship Building': 'bg-indigo-50 text-indigo-700',
  'Referral Partner': 'bg-teal-50 text-teal-700',
  'Referral Received': 'bg-emerald-50 text-emerald-700',
  'Converted': 'bg-green-50 text-green-700',
  'Inactive': 'bg-rose-50 text-rose-700',
};

const ACTIVITY_TYPES = ['Note', 'Phone Call', 'Email', 'Visit', 'Follow-Up'] as const;
const CONTACT_ACTIVITY_TYPES = ['Phone Call', 'Email', 'Visit'] as const;

type CrmRow = CrmRecord & { organization?: Organization; assigned_profile?: Profile | null };

export default function CRM({ onSelectOrg }: { onSelectOrg: (org: Organization) => void }) {
  const { profile } = useAuth();
  const [records, setRecords] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CrmRow | null>(null);
  const [filterStage, setFilterStage] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [activeAgencyId, setActiveAgencyId] = useState('');

  const effectiveAgencyId = profile?.agency_id || activeAgencyId;

  const load = useCallback(async () => {
    if (!effectiveAgencyId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('crm_records')
      .select('*, organization:organizations(*), assigned_profile:profiles!crm_records_assigned_to_fkey(*)')
      .eq('agency_id', effectiveAgencyId)
      .order('updated_at', { ascending: false });
    if (queryError) {
      setError('Failed to load CRM records. Please try again.');
      setLoading(false);
      return;
    }
    setRecords((data as CrmRow[]) || []);
    setLoading(false);
  }, [effectiveAgencyId]);

  // Load agencies for platform admin
  useEffect(() => {
    if (!profile?.agency_id && profile?.is_platform_admin) {
      supabase.from('agencies').select('*').order('name').then(({ data }) => {
        setAgencies((data as Agency[]) || []);
      });
    }
  }, [profile?.agency_id, profile?.is_platform_admin]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (filterStage !== 'All' && r.stage !== filterStage) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.organization?.name?.toLowerCase().includes(q) ||
        r.organization?.city?.toLowerCase().includes(q) ||
        r.organization?.state?.toLowerCase().includes(q) ||
        r.organization?.facility_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stageCounts = CRM_STAGES.reduce((acc, s) => {
    acc[s] = records.filter(r => r.stage === s).length;
    return acc;
  }, {} as Record<string, number>);

  const deleteRecord = async (id: string) => {
    if (!confirm('Remove this organization from your CRM? This will also delete its activities and referrals.')) return;
    const { error: delError } = await supabase.from('crm_records').delete().eq('id', id);
    if (delError) {
      alert('Failed to delete record. Please try again.');
      return;
    }
    setSelected(null);
    load();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Referral CRM</h2>
          <p className="mt-1 text-sm text-slate-500">{records.length} sources in your pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {!profile?.agency_id && profile?.is_platform_admin && (
            <select
              className="input w-auto text-xs"
              value={activeAgencyId}
              onChange={e => setActiveAgencyId(e.target.value)}
            >
              <option value="">Select agency...</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowAdd(true)} disabled={!effectiveAgencyId} className="btn-primary text-xs"><Plus className="h-4 w-4" /> Add Organization</button>
        </div>
      </div>

      {!effectiveAgencyId && !profile?.is_platform_admin && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">You need to be associated with an agency to use the CRM. Please complete onboarding first.</div>
      )}
      {!effectiveAgencyId && profile?.is_platform_admin && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Select an agency above to view and manage its CRM records.</div>
      )}

      {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, city, state, or facility type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStage('All')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filterStage === 'All' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
          All ({records.length})
        </button>
        {CRM_STAGES.map(s => (
          <button key={s} onClick={() => setFilterStage(s)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filterStage === s ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {s} ({stageCounts[s] || 0})
          </button>
        ))}
      </div>

      {loading && <p className="py-12 text-center text-sm text-slate-400">Loading CRM...</p>}
      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">{records.length === 0 ? 'No CRM records yet' : 'No records match your filters'}</p>
          <p className="mt-1 text-xs text-slate-400">{records.length === 0 ? 'Browse the Directory and click "Add to CRM" to start tracking relationships.' : 'Try a different search or stage filter.'}</p>
        </div>
      )}

      {/* CRM cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(r => (
          <button key={r.id} onClick={() => setSelected(r)} className="card group p-4 text-left transition-all hover:shadow-card-hover hover:ring-brand-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-brand-700">{r.organization?.name || 'Unknown Organization'}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{r.organization?.city}, {r.organization?.state}</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-brand-500" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`badge ${STAGE_COLORS[r.stage] || 'bg-slate-100 text-slate-600'}`}>{r.stage}</span>
              {r.assigned_profile && <span className="badge bg-slate-100 text-slate-600"><UserPlus className="h-3 w-3" />{r.assigned_profile.display_name}</span>}
              {r.next_follow_up && <span className="badge bg-amber-50 text-amber-700"><Clock className="h-3 w-3" />{new Date(r.next_follow_up + 'T00:00').toLocaleDateString()}</span>}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <CrmDetail
          record={selected}
          onClose={() => setSelected(null)}
          onUpdate={load}
          onSelectOrg={onSelectOrg}
          onDelete={deleteRecord}
        />
      )}

      {showAdd && effectiveAgencyId && (
        <AddOrgModal agencyId={effectiveAgencyId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />
      )}
    </div>
  );
}

function CrmDetail({ record, onClose, onUpdate, onSelectOrg, onDelete }: {
  record: CrmRow;
  onClose: () => void;
  onUpdate: () => void;
  onSelectOrg: (o: Organization) => void;
  onDelete: (id: string) => void;
}) {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [stage, setStage] = useState(record.stage);
  const [notes, setNotes] = useState(record.notes);
  const [nextFollowUp, setNextFollowUp] = useState(record.next_follow_up || '');
  const [assignedTo, setAssignedTo] = useState(record.assigned_to || '');
  const [newActivity, setNewActivity] = useState({ type: 'Note' as string, summary: '' });
  const [newReferral, setNewReferral] = useState({ referral_date: new Date().toISOString().slice(0, 10), status: 'Received', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [actError, setActError] = useState('');
  const [refError, setRefError] = useState('');

  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from('crm_activities').select('*').eq('crm_record_id', record.id).order('created_at', { ascending: false });
    setActivities((data as CrmActivity[]) || []);
  }, [record.id]);

  const loadReferrals = useCallback(async () => {
    const { data } = await supabase.from('referrals').select('*').eq('crm_record_id', record.id).order('referral_date', { ascending: false });
    setReferrals((data as Referral[]) || []);
  }, [record.id]);

  const loadTeam = useCallback(async () => {
    if (!profile?.agency_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('agency_id', profile.agency_id).order('display_name');
    setTeamMembers((data as Profile[]) || []);
  }, [profile?.agency_id]);

  useEffect(() => { loadActivities(); loadReferrals(); loadTeam(); }, [loadActivities, loadReferrals, loadTeam]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error: saveError } = await supabase.from('crm_records').update({
      stage, notes, next_follow_up: nextFollowUp || null,
      assigned_to: assignedTo || null,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id);
    setSaving(false);
    if (saveError) {
      setSaveMsg('Failed to save. Please try again.');
    } else {
      setSaveMsg('Saved successfully.');
      setTimeout(() => setSaveMsg(''), 2500);
      onUpdate();
    }
  };

  const addActivity = async () => {
    if (!newActivity.summary.trim()) return;
    setActError('');
    const { error: insertError } = await supabase.from('crm_activities').insert({
      crm_record_id: record.id, agency_id: record.agency_id,
      activity_type: newActivity.type, summary: newActivity.summary.trim(), created_by: profile?.id,
    });
    if (insertError) {
      setActError('Failed to log activity. Please try again.');
      return;
    }
    if (CONTACT_ACTIVITY_TYPES.includes(newActivity.type as typeof CONTACT_ACTIVITY_TYPES[number])) {
      await supabase.from('crm_records').update({ last_contacted_at: new Date().toISOString() }).eq('id', record.id);
    }
    setNewActivity({ type: 'Note', summary: '' });
    loadActivities();
    onUpdate();
  };

  const deleteActivity = async (id: string) => {
    const { error: delError } = await supabase.from('crm_activities').delete().eq('id', id);
    if (delError) return;
    loadActivities();
  };

  const addReferral = async () => {
    if (!newReferral.referral_date) return;
    setRefError('');
    const { error: insertError } = await supabase.from('referrals').insert({
      crm_record_id: record.id, agency_id: record.agency_id,
      referral_date: newReferral.referral_date, status: newReferral.status, notes: newReferral.notes.trim(),
    });
    if (insertError) {
      setRefError('Failed to add referral. Please try again.');
      return;
    }
    if (record.stage === 'Referral Partner' || record.stage === 'Relationship Building' || record.stage === 'Contacted') {
      await supabase.from('crm_records').update({ stage: 'Referral Received', updated_at: new Date().toISOString() }).eq('id', record.id);
      setStage('Referral Received');
    }
    setNewReferral({ referral_date: new Date().toISOString().slice(0, 10), status: 'Received', notes: '' });
    loadReferrals();
    onUpdate();
  };

  const deleteReferral = async (id: string) => {
    const { error: delError } = await supabase.from('referrals').delete().eq('id', id);
    if (delError) return;
    loadReferrals();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl animate-slide-in">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{record.organization?.name || 'Unknown'}</h2>
            <p className="text-xs text-slate-500">{record.organization?.facility_type} — {record.organization?.city}, {record.organization?.state}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(record.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500" title="Remove from CRM"><Trash2 className="h-5 w-5" /></button>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          {/* Stage + follow-up + assignment */}
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Pipeline Status</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Stage</label>
                <select className="input" value={stage} onChange={e => setStage(e.target.value as CrmStage)}>
                  {CRM_STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Next Follow-Up</label>
                <input type="date" className="input" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Assigned To</label>
              <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.display_name} ({m.role})</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="label">Notes</label>
              <textarea className="input min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs"><Save className="h-3.5 w-3.5" /> Save Changes</button>
              {saveMsg && <span className={`text-xs font-medium ${saveMsg.includes('Failed') ? 'text-rose-600' : 'text-emerald-600'}`}>{saveMsg}</span>}
            </div>
          </div>

          {/* Add activity */}
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Log Activity</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className="input sm:w-36" value={newActivity.type} onChange={e => setNewActivity(a => ({ ...a, type: e.target.value }))}>
                {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input
                className="input flex-1"
                placeholder="Activity summary..."
                value={newActivity.summary}
                onChange={e => setNewActivity(a => ({ ...a, summary: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addActivity(); }}
              />
              <button onClick={addActivity} className="btn-primary whitespace-nowrap text-xs"><Plus className="h-3.5 w-3.5" /> Log</button>
            </div>
            {actError && <p className="mt-2 text-xs text-rose-600">{actError}</p>}
          </div>

          {/* Activity history */}
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Activity History</h3>
            <div className="space-y-2">
              {activities.length === 0 && <p className="py-2 text-xs text-slate-400">No activities logged yet.</p>}
              {activities.map(a => (
                <div key={a.id} className="group flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700"><span className="font-semibold">{a.activity_type}:</span> {a.summary}</p>
                    <p className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteActivity(a.id)} className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Referrals */}
          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-emerald-600" /> Referrals</h3>
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={newReferral.referral_date} onChange={e => setNewReferral(r => ({ ...r, referral_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={newReferral.status} onChange={e => setNewReferral(r => ({ ...r, status: e.target.value }))}>
                    <option>Received</option><option>In Progress</option><option>Admitted</option><option>Discharged</option><option>Lost</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" placeholder="Optional..." value={newReferral.notes} onChange={e => setNewReferral(r => ({ ...r, notes: e.target.value }))} />
                </div>
              </div>
              <button onClick={addReferral} className="btn-primary w-full text-xs"><Plus className="h-3.5 w-3.5" /> Add Referral</button>
              {refError && <p className="text-xs text-rose-600">{refError}</p>}
            </div>

            {referrals.length > 0 && (
              <div className="mt-3 space-y-2">
                {referrals.map(rf => (
                  <div key={rf.id} className="group flex items-start gap-3 rounded-lg bg-emerald-50/50 p-3 ring-1 ring-emerald-100">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{rf.status} — {new Date(rf.referral_date + 'T00:00').toLocaleDateString()}</p>
                      {rf.notes && <p className="text-xs text-slate-500">{rf.notes}</p>}
                    </div>
                    <button onClick={() => deleteReferral(rf.id)} className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {record.organization && (
            <button onClick={() => { onSelectOrg(record.organization!); onClose(); }} className="btn-secondary w-full text-xs">
              <FileText className="h-3.5 w-3.5" /> View Full Organization Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddOrgModal({ agencyId, onClose, onAdded }: { agencyId: string; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const searchOrgs = useCallback(async () => {
    if (!search.trim()) { setResults([]); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('organizations')
      .select('*')
      .or(`name.ilike.%${search}%,city.ilike.%${search}%`)
      .limit(20);
    if (queryError) {
      setError('Search failed. Please try again.');
    } else {
      setResults((data as Organization[]) || []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(searchOrgs, 300);
    return () => window.clearTimeout(timer);
  }, [searchOrgs]);

  const addOrg = async (org: Organization) => {
    setAdding(true);
    setError('');
    const { data: existing } = await supabase
      .from('crm_records')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('organization_id', org.id)
      .maybeSingle();
    if (existing) {
      setError(`${org.name} is already in your CRM.`);
      setAdding(false);
      return;
    }
    const { error: insertError } = await supabase.from('crm_records').insert({
      agency_id: agencyId, organization_id: org.id, stage: 'Not Contacted',
    });
    if (insertError) {
      setError('Failed to add organization. Please try again.');
      setAdding(false);
      return;
    }
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Add Organization to CRM</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search organizations by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          {loading && <p className="mt-3 py-4 text-center text-sm text-slate-400">Searching...</p>}
          {!loading && search && results.length === 0 && !error && (
            <p className="mt-3 py-4 text-center text-sm text-slate-400">No organizations found. Try a different search.</p>
          )}
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
            {results.map(o => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{o.name}</p>
                  <p className="text-xs text-slate-500">{o.facility_type} — {o.city}, {o.state}</p>
                </div>
                <button
                  onClick={() => addOrg(o)}
                  disabled={adding}
                  className="btn-primary ml-2 flex-shrink-0 whitespace-nowrap text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
