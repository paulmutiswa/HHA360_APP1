import { useEffect, useState, useCallback } from 'react';
import {
  Building2, Phone, Clock, TrendingUp, Users, CheckCircle2,
  FileWarning, CheckSquare, Search, Activity, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Page } from './Layout';
import type { CrmRecord, CrmActivity, Referral, Task, EmployeeCredential } from '@/lib/types';

interface Stats {
  totalSources: number;
  contactsMade: number;
  followUpsDue: number;
  newLeads: number;
  referralsReceived: number;
  conversions: number;
  tasksDue: number;
  docsExpiring: number;
  credsExpiring: number;
}

export default function Dashboard({ onPage }: { onPage: (p: Page) => void }) {
  const { profile, agency } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<{ id: string; type: string; summary: string; created_at: string }[]>([]);
  const [facilityBreakdown, setFacilityBreakdown] = useState<{ type: string; count: number }[]>([]);
  const [monthlyActivity, setMonthlyActivity] = useState<{ label: string; count: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.agency_id) return;
    const aid = profile.agency_id;

    const [crm, activities, tasks, creds, referrals, orgs] = await Promise.all([
      supabase.from('crm_records').select('*, organization:organizations(facility_type)').eq('agency_id', aid),
      supabase.from('crm_activities').select('*').eq('agency_id', aid).order('created_at', { ascending: false }).limit(8),
      supabase.from('tasks').select('*').eq('agency_id', aid).eq('completed', false),
      supabase.from('employee_credentials').select('*').eq('agency_id', aid),
      supabase.from('referrals').select('*').eq('agency_id', aid),
      supabase.from('crm_records').select('organization:organizations(facility_type)').eq('agency_id', aid),
    ]);

    if (crm.error || activities.error || tasks.error || creds.error || referrals.error) {
      setError('Some data could not be loaded. Please refresh the page.');
    }

    const crmRows = (crm.data || []) as CrmRecord[];
    const activityRows = (activities.data || []) as CrmActivity[];
    const taskRows = (tasks.data || []) as Task[];
    const credRows = (creds.data || []) as EmployeeCredential[];
    const referralRows = (referrals.data || []) as Referral[];
    const orgRows = (orgs.data || []) as unknown as Array<{ organization: { facility_type: string } | null }>;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    setUpcomingTasks(taskRows
      .slice()
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      })
      .slice(0, 5));

    setStats({
      totalSources: crmRows.length,
      contactsMade: crmRows.filter(r => r.last_contacted_at).length,
      followUpsDue: crmRows.filter(r => r.next_follow_up && r.next_follow_up <= today).length,
      newLeads: crmRows.filter(r => r.stage === 'Not Contacted' || r.stage === 'Attempted Contact').length,
      referralsReceived: referralRows.length,
      conversions: referralRows.filter(r => r.status === 'Converted' || r.status === 'Admitted').length,
      tasksDue: taskRows.filter(t => !t.due_date || t.due_date <= today).length,
      docsExpiring: 0,
      credsExpiring: credRows.filter(c => c.expiration_date && c.expiration_date <= in30).length,
    });

    setRecentActivity(activityRows.map(a => ({ id: a.id, type: a.activity_type, summary: a.summary, created_at: a.created_at })));

    // Real facility type breakdown from CRM
    const typeMap: Record<string, number> = {};
    orgRows.forEach(r => {
      const ft = r.organization?.facility_type || 'Unknown';
      typeMap[ft] = (typeMap[ft] || 0) + 1;
    });
    setFacilityBreakdown(Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count })));

    // Real monthly activity (last 6 months)
    const months: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short' });
      const count = activityRows.filter(a => {
        const ad = new Date(a.created_at);
        return `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}` === key;
      }).length;
      months.push({ label, count });
    }
    setMonthlyActivity(months);
    setLoading(false);
  }, [profile?.agency_id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-sm text-slate-400">Loading dashboard...</p></div>;

  const cards = [
    { icon: Building2, label: 'Referral Sources', value: stats?.totalSources ?? 0, color: 'bg-brand-50 text-brand-700' },
    { icon: Phone, label: 'Contacts Made', value: stats?.contactsMade ?? 0, color: 'bg-emerald-50 text-emerald-700' },
    { icon: Clock, label: 'Follow-Ups Due', value: stats?.followUpsDue ?? 0, color: 'bg-amber-50 text-amber-700' },
    { icon: Users, label: 'New Leads', value: stats?.newLeads ?? 0, color: 'bg-indigo-50 text-indigo-700' },
    { icon: TrendingUp, label: 'Referrals Received', value: stats?.referralsReceived ?? 0, color: 'bg-teal-50 text-teal-700' },
    { icon: CheckCircle2, label: 'Conversions', value: stats?.conversions ?? 0, color: 'bg-green-50 text-green-700' },
    { icon: FileWarning, label: 'Creds Expiring', value: stats?.credsExpiring ?? 0, color: 'bg-orange-50 text-orange-700' },
    { icon: CheckSquare, label: 'Tasks Due', value: stats?.tasksDue ?? 0, color: 'bg-rose-50 text-rose-700' },
  ];

  const maxMonthly = Math.max(...monthlyActivity.map(m => m.count), 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Welcome back, {profile?.display_name?.split(' ')[0] || 'there'}</h2>
          <p className="mt-1 text-sm text-slate-500">{agency?.name} — {agency?.city}, {agency?.state}</p>
        </div>
        <button onClick={() => onPage('find')} className="btn-primary">
          <Search className="h-4 w-4" /> Find Referral Sources
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Upcoming tasks */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckSquare className="h-4 w-4 text-rose-600" /> Upcoming Tasks</h3>
          <button onClick={() => onPage('tasks')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">View all</button>
        </div>
        {upcomingTasks.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No open tasks yet. Add a task to see follow-ups here.</p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map(task => {
              const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10);
              return (
                <div key={task.id} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${overdue ? 'bg-rose-500' : 'bg-brand-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{task.title}</p>
                    {task.description && <p className="mt-0.5 truncate text-[11px] text-slate-500">{task.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      {task.due_date && <span className={overdue ? 'font-semibold text-rose-600' : ''}>{overdue ? 'Overdue' : 'Due'} {new Date(task.due_date + 'T00:00').toLocaleDateString()}{task.due_time ? ` at ${task.due_time}` : ''}</span>}
                      <span className="rounded bg-white px-1.5 py-0.5 font-medium text-slate-500">{task.priority}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Outreach Activity</h3>
          {monthlyActivity.every(m => m.count === 0) ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No outreach activity yet. Log activities in your CRM to see trends here.</div>
          ) : (
            <div className="flex h-48 items-end justify-around gap-2">
              {monthlyActivity.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-brand-500/80 transition-all hover:bg-brand-600" style={{ height: `${Math.max((m.count / maxMonthly) * 100, m.count > 0 ? 4 : 0)}%` }} title={`${m.count} activities`} />
                  <span className="text-[9px] text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-slate-400">CRM activities logged per month</p>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Activity className="h-4 w-4 text-brand-600" /> Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No activity yet. Start by adding sources to your CRM.</p>}
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700">{a.type}: {a.summary}</p>
                  <p className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Facility type breakdown */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Referral Sources by Facility Type</h3>
        {facilityBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">No CRM sources yet. Add organizations from the Directory or Find Referral Sources to see your breakdown.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {facilityBreakdown.map(({ type, count }) => (
              <div key={type} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="badge bg-brand-50 text-brand-700">{count}</span>
                <span className="text-xs font-medium text-slate-600">{type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
