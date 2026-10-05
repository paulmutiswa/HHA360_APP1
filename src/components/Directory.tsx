import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, MapPin, Building2, ChevronRight, ExternalLink, Phone, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Organization } from '@/lib/types';

const FACILITY_TYPES = ['All', 'Hospital', 'VA Medical Center', 'Skilled Nursing Facility', 'Rehabilitation Facility', 'Assisted Living', 'Senior Living', 'Hospice', 'Physician Office', 'Clinic', 'Behavioral Health', 'Dialysis Center', 'Area Agency on Aging', 'Social Service', 'Veterans Organization', 'Case Management', 'Insurance/Managed Care', 'Community Organization'];

const VERIFICATION_BADGE: Record<string, string> = {
  'Verified': 'bg-emerald-50 text-emerald-700',
  'Needs Verification': 'bg-amber-50 text-amber-700',
  'Community Submitted': 'bg-indigo-50 text-indigo-700',
  'Outdated': 'bg-orange-50 text-orange-700',
  'Unable to Verify': 'bg-rose-50 text-rose-700',
};

export default function Directory({ onSelectOrg }: { onSelectOrg: (org: Organization) => void }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('organizations').select('*', { count: 'exact' }).order('name');
    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,contact_person.ilike.%${search}%,department.ilike.%${search}%`);
    if (stateFilter !== 'All') query = query.eq('state', stateFilter);
    if (typeFilter !== 'All') query = query.eq('facility_type', typeFilter);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await query;
    setOrgs((data as Organization[]) || []);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [search, stateFilter, typeFilter, page]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const states = useMemo(() => ['All', ...new Set(orgs.map(o => o.state).filter(Boolean))], [orgs]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Referral Source Directory</h2>
          <p className="mt-1 text-sm text-slate-500">Search hospitals, VA facilities, SNFs, and other referral sources nationwide.</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-100 sm:px-4">
          <div className="text-right">
            <p className="text-lg font-extrabold leading-none text-brand-700 sm:text-xl">{totalCount === null ? '—' : totalCount.toLocaleString()}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600 sm:text-xs">Total contacts</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, city, department, contact..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <select className="input sm:w-36" value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(0); }}>
          {states.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
        </select>
        <select className="input sm:w-48" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}>
          {FACILITY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading && <p className="py-12 text-center text-sm text-slate-400">Loading...</p>}
      {!loading && orgs.length === 0 && (
        <div className="card p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No organizations found</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting filters, or an admin can import data from the Admin Portal.</p>
        </div>
      )}

      {/* Results */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map(o => (
          <button key={o.id} onClick={() => onSelectOrg(o)} className="card group p-4 text-left transition-all hover:shadow-card-hover hover:ring-brand-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-brand-700">{o.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" /><span className="truncate">{o.city}, {o.state}</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-brand-500" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge bg-slate-100 text-slate-600">{o.facility_type}</span>
              <span className={`badge ${VERIFICATION_BADGE[o.verification_status] || 'bg-slate-100 text-slate-600'}`}>{o.verification_status}</span>
            </div>
            {o.phone && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{o.phone}</p>}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {orgs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Page {page + 1}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={orgs.length < PAGE_SIZE} className="btn-secondary text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
