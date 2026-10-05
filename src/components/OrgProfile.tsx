import { useState, useEffect, useCallback } from 'react';
import {
  X, Phone, Mail, Globe, MapPin, Navigation, Plus, Calendar,
  AlertTriangle, Check, Building2, User, FileText, Clock, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Organization, ProfessionalContact, CrmRecord, Agency } from '@/lib/types';

const VERIFICATION_BADGE: Record<string, string> = {
  'Verified': 'bg-emerald-50 text-emerald-700',
  'Needs Verification': 'bg-amber-50 text-amber-700',
  'Community Submitted': 'bg-indigo-50 text-indigo-700',
  'Outdated': 'bg-orange-50 text-orange-700',
  'Unable to Verify': 'bg-rose-50 text-rose-700',
};

export default function OrgProfile({ org, onClose, onAddToCrm }: { org: Organization; onClose: () => void; onAddToCrm: () => void }) {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<ProfessionalContact[]>([]);
  const [crmRecord, setCrmRecord] = useState<CrmRecord | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [showAgencyPicker, setShowAgencyPicker] = useState(false);

  const effectiveAgencyId = profile?.agency_id || selectedAgencyId;

  const loadDetails = useCallback(async () => {
    const [c, crm] = await Promise.all([
      supabase.from('professional_contacts').select('*').eq('organization_id', org.id),
      effectiveAgencyId
        ? supabase.from('crm_records').select('*').eq('organization_id', org.id).eq('agency_id', effectiveAgencyId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setContacts((c.data as ProfessionalContact[]) || []);
    setCrmRecord(crm.data as CrmRecord | null);
  }, [org.id, effectiveAgencyId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  // Load agencies for platform admin picker
  useEffect(() => {
    if (!profile?.agency_id && profile?.is_platform_admin) {
      setShowAgencyPicker(true);
      supabase.from('agencies').select('*').order('name').then(({ data }) => {
        setAgencies((data as Agency[]) || []);
      });
    }
  }, [profile?.agency_id, profile?.is_platform_admin]);

  const handleAddToCrm = async () => {
    if (!effectiveAgencyId) {
      setAddError('Please select an agency first.');
      return;
    }
    setAdding(true);
    setAddError('');
    const { error: insertError } = await supabase.from('crm_records').insert({
      agency_id: effectiveAgencyId, organization_id: org.id, stage: 'Not Contacted',
    });
    setAdding(false);
    if (insertError) {
      setAddError(insertError.message || 'Failed to add to CRM. Please try again.');
      return;
    }
    onAddToCrm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Building2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{org.name}</h2>
                <p className="text-xs text-slate-500">{org.facility_type}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {/* Action buttons */}
          <div className="mb-4 flex flex-wrap gap-2">
            {org.phone && <a href={`tel:${org.phone}`} className="btn-secondary text-xs"><Phone className="h-3.5 w-3.5" /> Call</a>}
            {org.general_email && <a href={`mailto:${org.general_email}`} className="btn-secondary text-xs"><Mail className="h-3.5 w-3.5" /> Email</a>}
            {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="btn-secondary text-xs"><Globe className="h-3.5 w-3.5" /> Website</a>}
            <a href={`https://maps.google.com?q=${encodeURIComponent(org.address + ' ' + org.city + ' ' + org.state + ' ' + org.zip)}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs"><Navigation className="h-3.5 w-3.5" /> Directions</a>
            {crmRecord ? (
              <span className="badge bg-emerald-50 text-emerald-700"><Check className="h-3 w-3" /> In CRM</span>
            ) : (
              <button onClick={handleAddToCrm} disabled={adding} className="btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> {adding ? 'Adding...' : 'Add to CRM'}</button>
            )}
            <button onClick={() => setShowReport(v => !v)} className="btn-ghost text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Report</button>
          </div>

          {/* Agency picker for platform admins without an agency */}
          {showAgencyPicker && !crmRecord && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800"><Building2 className="h-3.5 w-3.5" /> Select an agency to add this organization to:</p>
              <select
                className="input"
                value={selectedAgencyId}
                onChange={e => setSelectedAgencyId(e.target.value)}
              >
                <option value="">Choose an agency...</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}, {a.state}</option>)}
              </select>
            </div>
          )}

          {/* No agency message for non-admin users */}
          {!profile?.agency_id && !profile?.is_platform_admin && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              You need to be associated with an agency to use the CRM. Please complete onboarding first.
            </div>
          )}

          {addError && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="mb-1 h-4 w-4" /> {addError}</div>}

          {/* Report form */}
          {showReport && <ReportForm org={org} onClose={() => setShowReport(false)} />}

          {/* Details */}
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Organization Details</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Detail label="Address" value={`${org.address}, ${org.city}, ${org.state} ${org.zip}`} icon={MapPin} />
              {org.county && <Detail label="County" value={org.county} />}
              {org.phone && <Detail label="Phone" value={org.phone} icon={Phone} />}
              {org.website && <Detail label="Website" value={org.website} icon={Globe} />}
              {org.department && <Detail label="Department" value={org.department} />}
              {org.referral_phone && <Detail label="Referral Phone" value={org.referral_phone} icon={Phone} />}
              {org.referral_fax && <Detail label="Referral Fax" value={org.referral_fax} />}
              {org.general_email && <Detail label="General Email" value={org.general_email} icon={Mail} />}
              {org.referral_email && <Detail label="Referral Email" value={org.referral_email} icon={Mail} />}
              {org.contact_person && <Detail label="Contact Person" value={org.contact_person} icon={User} />}
              {org.contact_title && <Detail label="Contact Title" value={org.contact_title} />}
              {org.contact_email && <Detail label="Contact Email" value={org.contact_email} icon={Mail} />}
              {org.contact_phone && <Detail label="Contact Phone" value={org.contact_phone} icon={Phone} />}
              {org.referral_instructions && <Detail label="Referral Instructions" value={org.referral_instructions} />}
              <Detail label="Verification Status" value={org.verification_status} badge />
              {org.date_added && <Detail label="Date Added" value={new Date(org.date_added + 'T00:00').toLocaleDateString()} icon={Calendar} />}
              {org.last_verified_date && <Detail label="Last Verified" value={new Date(org.last_verified_date + 'T00:00').toLocaleDateString()} icon={Clock} />}
              {org.source_label && <Detail label="Source" value={org.source_label} />}
              {org.notes && <Detail label="Notes" value={org.notes} />}
            </dl>
          </div>

          {/* Professional contacts */}
          {contacts.length > 0 && (
            <div className="card mt-4 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Professional Contacts</h3>
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <span className={`badge ${VERIFICATION_BADGE[c.verification_status] || 'bg-slate-100 text-slate-600'}`}>{c.verification_status}</span>
                    </div>
                    <p className="text-xs text-slate-500">{c.title} — {c.department}</p>
                    {c.phone && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{c.phone}</p>}
                    {c.email && <p className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{c.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon, badge }: { label: string; value: string; icon?: typeof Phone; badge?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm text-slate-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {badge ? <span className={`badge ${VERIFICATION_BADGE[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span> : value}
      </dd>
    </div>
  );
}

function ReportForm({ org, onClose }: { org: Organization; onClose: () => void }) {
  const { profile } = useAuth();
  const [type, setType] = useState('Wrong phone number');
  const [field, setField] = useState('phone');
  const [suggested, setSuggested] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    await supabase.from('contact_verifications').insert({
      organization_id: org.id, field_name: field, original_value: (org as unknown as Record<string, unknown>)[field] as string || '',
      suggested_value: suggested, correction_type: type, submitted_by: profile?.id, evidence,
    });
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  if (submitted) return <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><Check className="mb-1 h-4 w-4" /> Thank you. Your correction has been submitted for review.</div>;

  return (
    <div className="mb-4 card p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-500" /> Report Incorrect Information</h4>
      <div className="space-y-3">
        <div>
          <label className="label">Issue Type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            <option>Wrong phone number</option><option>Wrong email</option><option>Wrong department</option>
            <option>Contact no longer works here</option><option>New contact</option><option>Updated title</option><option>Updated referral instructions</option>
          </select>
        </div>
        <div>
          <label className="label">Field to Correct</label>
          <select className="input" value={field} onChange={e => setField(e.target.value)}>
            <option value="phone">Phone</option><option value="general_email">Email</option><option value="department">Department</option>
            <option value="contact_person">Contact Person</option><option value="contact_title">Contact Title</option><option value="referral_instructions">Referral Instructions</option>
          </select>
        </div>
        <div>
          <label className="label">Correct Value</label>
          <input className="input" value={suggested} onChange={e => setSuggested(e.target.value)} placeholder="Enter the correct information..." />
        </div>
        <div>
          <label className="label">Evidence / Source</label>
          <input className="input" value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="How did you verify this?" />
        </div>
        <button onClick={submit} className="btn-primary text-xs">Submit for Review</button>
      </div>
    </div>
  );
}
