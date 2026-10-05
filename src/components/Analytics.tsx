import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Phone, CheckCircle2, ListChecks, Clock3, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface AnalyticsData {
  sources: number;
  contactsAttempted: number;
  successfulContacts: number;
  partners: number;
  referrals: number;
  conversions: number;
  tasks: number;
  completedTasks: number;
  dueTasks: number;
  overdueTasks: number;
  months: Array<{ key: string; label: string; activities: number; tasks: number }>;
}

const EMPTY_DATA: AnalyticsData = {
  sources: 0,
  contactsAttempted: 0,
  successfulContacts: 0,
  partners: 0,
  referrals: 0,
  conversions: 0,
  tasks: 0,
  completedTasks: 0,
  dueTasks: 0,
  overdueTasks: 0,
  months: [],
};

export default function Analytics() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.agency_id) return;
    setLoading(true);
    setError('');

    const [crmResult, activityResult, referralResult, taskResult] = await Promise.all([
      supabase.from('crm_records').select('stage').eq('agency_id', profile.agency_id),
      supabase.from('crm_activities').select('activity_type, created_at').eq('agency_id', profile.agency_id),
      supabase.from('referrals').select('status, referral_date').eq('agency_id', profile.agency_id),
      supabase.from('tasks').select('completed, due_date, created_at').eq('agency_id', profile.agency_id),
    ]);

    const firstError = crmResult.error || activityResult.error || referralResult.error || taskResult.error;
    if (firstError) {
      setError('Analytics could not be loaded right now. Please try again.');
      setLoading(false);
      return;
    }

    const records = (crmResult.data || []) as Array<{ stage: string }>;
    const activities = (activityResult.data || []) as Array<{ activity_type: string; created_at: string }>;
    const referrals = (referralResult.data || []) as Array<{ status: string; referral_date: string }>;
    const tasks = (taskResult.data || []) as Array<{ completed: boolean; due_date: string | null; created_at: string }>;
    const today = new Date().toISOString().slice(0, 10);

    const monthLabels = getLastSixMonths();
    const monthData = monthLabels.map(month => ({
      ...month,
      activities: activities.filter(a => month.key === monthKey(a.created_at)).length,
      tasks: tasks.filter(t => month.key === monthKey(t.created_at)).length,
    }));

    setData({
      sources: records.length,
      contactsAttempted: activities.filter(a => ['Phone Call', 'Email', 'Visit'].includes(a.activity_type)).length,
      successfulContacts: records.filter(r => ['Contacted', 'Follow-Up Required', 'Relationship Building', 'Referral Partner', 'Referral Received', 'Converted'].includes(r.stage)).length,
      partners: records.filter(r => r.stage === 'Referral Partner').length,
      referrals: referrals.length,
      conversions: records.filter(r => r.stage === 'Converted').length,
      tasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      dueTasks: tasks.filter(t => !t.completed && (!t.due_date || t.due_date <= today)).length,
      overdueTasks: tasks.filter(t => !t.completed && !!t.due_date && t.due_date < today).length,
      months: monthData,
    });
    setLoading(false);
  }, [profile?.agency_id]);

  useEffect(() => { load(); }, [load]);

  const metrics = [
    { label: 'Total Referral Sources', value: data.sources, icon: Users, color: 'bg-brand-50 text-brand-700' },
    { label: 'Contacts Attempted', value: data.contactsAttempted, icon: Phone, color: 'bg-amber-50 text-amber-700' },
    { label: 'Successful Contacts', value: data.successfulContacts, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Referral Partners', value: data.partners, icon: TrendingUp, color: 'bg-teal-50 text-teal-700' },
    { label: 'Referrals Received', value: data.referrals, icon: TrendingUp, color: 'bg-sky-50 text-sky-700' },
    { label: 'Conversions', value: data.conversions, icon: CheckCircle2, color: 'bg-green-50 text-green-700' },
    { label: 'Tasks Tracked', value: data.tasks, icon: ListChecks, color: 'bg-orange-50 text-orange-700' },
  ];

  const maxActivity = Math.max(...data.months.map(m => m.activities + m.tasks), 1);
  const completionPercent = data.tasks > 0 ? Math.round((data.completedTasks / data.tasks) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl"><BarChart3 className="h-6 w-6 text-brand-600" /> Referral Analytics</h2>
        <p className="mt-1 text-sm text-slate-500">Track outreach performance, referral conversion, and task progress from your live CRM.</p>
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-3">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${m.color}`}><Icon className="h-4 w-4" /></div>
              <p className="text-xl font-bold text-slate-900">{loading ? '—' : m.value}</p>
              <p className="text-[10px] text-slate-500">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Outreach Activity (6 months)</h3>
            <span className="text-[10px] text-slate-400">Activities + tasks</span>
          </div>
          {loading ? <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading activity...</div> : data.months.length > 0 ? (
            <div className="flex h-40 items-end justify-around gap-2">
              {data.months.map(month => (
                <div key={month.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-[132px] w-full items-end gap-0.5">
                    <div className="w-1/2 rounded-t bg-brand-500/85 transition-all" style={{ height: `${Math.max((month.activities / maxActivity) * 100, month.activities > 0 ? 4 : 0)}%` }} title={`${month.activities} activities`} />
                    <div className="w-1/2 rounded-t bg-orange-400/85 transition-all" style={{ height: `${Math.max((month.tasks / maxActivity) * 100, month.tasks > 0 ? 4 : 0)}%` }} title={`${month.tasks} tasks`} />
                  </div>
                  <span className="text-[9px] text-slate-400">{month.label}</span>
                </div>
              ))}
            </div>
          ) : <EmptyChart message="No outreach activity or tasks saved yet." />}
          <div className="mt-3 flex justify-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-500" /> CRM activities</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-400" /> Tasks</span></div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Referral Conversion Funnel</h3>
          {loading ? <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading funnel...</div> : (
            <div className="space-y-3">
              <FunnelRow label="Sources" value={data.sources} max={data.sources} />
              <FunnelRow label="Contacted" value={data.successfulContacts} max={data.sources} />
              <FunnelRow label="Partners" value={data.partners} max={data.sources} />
              <FunnelRow label="Referrals" value={data.referrals} max={data.sources} />
              <FunnelRow label="Conversions" value={data.conversions} max={data.sources} />
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold"><ListChecks className="h-4 w-4 text-orange-500" /> Task & Reminder Progress</h3>
            <p className="mt-1 text-xs text-slate-500">Every saved task and reminder is included in this activity summary.</p>
          </div>
          <span className="text-lg font-bold text-slate-900">{loading ? '—' : `${completionPercent}%`}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${completionPercent}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <TaskStat icon={ListChecks} label="Total saved" value={data.tasks} />
          <TaskStat icon={CheckCircle2} label="Completed" value={data.completedTasks} />
          <TaskStat icon={data.overdueTasks > 0 ? AlertCircle : Clock3} label={data.overdueTasks > 0 ? 'Overdue' : 'Due'} value={data.overdueTasks > 0 ? data.overdueTasks : data.dueTasks} warning={data.overdueTasks > 0} />
        </div>
      </div>

      <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">Analytics are connected to your CRM records, logged activities, referrals, tasks, and reminders. Data updates whenever you open this tab.</div>
    </div>
  );
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="text-slate-500">{value}</span></div><div className="h-6 rounded bg-slate-100"><div className="h-full rounded bg-brand-500 transition-all" style={{ width: `${width}%` }} /></div></div>;
}

function TaskStat({ icon: Icon, label, value, warning = false }: { icon: typeof ListChecks; label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-lg p-3 ${warning ? 'bg-rose-50' : 'bg-slate-50'}`}><Icon className={`mx-auto h-4 w-4 ${warning ? 'text-rose-500' : 'text-slate-500'}`} /><p className={`mt-1 text-lg font-bold ${warning ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>;
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400">{message}</div>;
}

function monthKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getLastSixMonths(): Array<{ key: string; label: string }> {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { key: monthKey(date.toISOString()), label: date.toLocaleDateString(undefined, { month: 'short' }) };
  });
}
