import { useEffect, useState, useCallback } from 'react';
import { Search, MapPin, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Organization } from '@/lib/types';

const RADII = [5, 10, 25, 50, 100];

export default function FindReferrals({ onSelectOrg }: { onSelectOrg: (org: Organization) => void }) {
  const { agency } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [zip, setZip] = useState(agency?.zip || '');
  const [radius, setRadius] = useState(agency?.service_radius_miles || 25);
  const [zipError, setZipError] = useState('');
  const [types, setTypes] = useState<string[]>([]);

  const FACILITY_TYPES = ['Hospital', 'Home Health Agency', 'VA Medical Center', 'Skilled Nursing Facility', 'Rehabilitation Facility', 'Assisted Living', 'Hospice', 'Physician Office', 'Case Management'];

  const toggleType = (t: string) => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const search = useCallback(async () => {
    const normalizedZip = zip.replace(/\\D/g, '');
    if (normalizedZip.length > 0 && normalizedZip.length < 5) {
      setZipError('Enter a 5-digit ZIP code to search nearby sources.');
      setOrgs([]);
      setLoading(false);
      return;
    }
    setZipError('');
    setLoading(true);
    let query = supabase.from('organizations').select('*').order('name');
    if (normalizedZip) {
      const prefixLength = radius <= 10 ? 5 : radius <= 25 ? 4 : radius <= 50 ? 3 : 2;
      query = prefixLength === 5
        ? query.eq('zip', normalizedZip)
        : query.ilike('zip', `${normalizedZip.slice(0, prefixLength)}%`);
    }
    if (types.length === 1) query = query.eq('facility_type', types[0]);
    else if (types.length > 1) query = query.in('facility_type', types);
    const { data, error } = await query.limit(100);
    if (!error) setOrgs((data as Organization[]) || []);
    setLoading(false);
  }, [zip, radius, types]);

  useEffect(() => {
    const timer = window.setTimeout(search, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Find Referral Sources</h2>
        <p className="mt-1 text-sm text-slate-500">Identify referral organizations near your service area.</p>
      </div>

      {/* Search panel */}
      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:min-w-0">
            <label className="label" htmlFor="referral-zip">ZIP Code</label>
            <input
              id="referral-zip"
              className="input"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\\D/g, '').slice(0, 5))}
              placeholder="43206"
              inputMode="numeric"
              maxLength={5}
              aria-describedby={zipError ? 'referral-zip-error' : undefined}
            />
            {zipError && <p id="referral-zip-error" className="mt-1 text-xs font-medium text-rose-600">{zipError}</p>}
          </div>
          <div className="sm:min-w-0">
            <label className="label" htmlFor="referral-radius">Radius (miles)</label>
            <select id="referral-radius" className="input" value={radius} onChange={e => setRadius(Number(e.target.value))}>
              {RADII.map(r => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </div>
          <div className="sm:min-w-0">
            <label className="label">Facility Types</label>
            <div className="flex flex-wrap gap-1.5">
              {FACILITY_TYPES.map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${types.includes(t) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
          <p className="text-xs text-brand-800">Results show organizations matching your criteria. This does not guarantee referrals — relationships are built through professional outreach.</p>
        </div>
      </div>

      {/* Results */}
      {loading && <p className="py-12 text-center text-sm text-slate-400">Searching...</p>}
      {!loading && orgs.length === 0 && (
        <div className="card p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No organizations found in this area</p>
          <p className="mt-1 text-xs text-slate-400">Try expanding the radius or removing filters. An admin can import data from the Excel workbook.</p>
        </div>
      )}

      {!loading && orgs.length > 0 && (
        <p className="text-xs text-slate-500">{orgs.length === 100 ? '100+' : orgs.length} {orgs.length === 1 ? 'organization' : 'organizations'} found{zip ? ` near ${zip}` : ''}{radius ? ` within ${radius} miles` : ''}{types.length > 0 ? ` · ${types.length} ${types.length === 1 ? 'type' : 'types'} selected` : ''}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map(o => (
          <button key={o.id} onClick={() => onSelectOrg(o)} className="card group p-4 text-left transition-all hover:shadow-card-hover hover:ring-brand-200">
            <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-brand-700">{o.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{o.city}, {o.state} {o.zip}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge bg-slate-100 text-slate-600">{o.facility_type}</span>
              {o.verification_status === 'Verified' && <span className="badge bg-emerald-50 text-emerald-700">Verified</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
