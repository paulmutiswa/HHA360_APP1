import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, X, Save, Trash2, Check, Clock, Flag, CheckSquare, AlertCircle, Loader2,
  Bell, BellOff, Pencil, Share2, Mail, MessageSquare, Calendar, AlarmClock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Task, Profile, CrmRecord, Agency } from '@/lib/types';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function Tasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'due' | 'completed'>('all');
  const [error, setError] = useState('');
  const [ringingTask, setRingingTask] = useState<Task | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [activeAgencyId, setActiveAgencyId] = useState('');

  const effectiveAgencyId = profile?.agency_id || activeAgencyId;

  const load = useCallback(async () => {
    if (!effectiveAgencyId) { setLoading(false); return; }
    setError('');
    const { data, error: queryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('agency_id', effectiveAgencyId)
      .order('due_date', { ascending: true, nullsFirst: false });
    if (queryError) {
      setError('Failed to load tasks. Please try again.');
      setLoading(false);
      return;
    }
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [effectiveAgencyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile?.agency_id && profile?.is_platform_admin) {
      supabase.from('agencies').select('*').order('name').then(({ data }) => {
        setAgencies((data as Agency[]) || []);
      });
    }
  }, [profile?.agency_id, profile?.is_platform_admin]);

  // Alarm checker — runs every 15 seconds
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const nowTime = now.toTimeString().slice(0, 5);
      for (const t of tasks) {
        if (t.completed || !t.reminder_enabled || !t.due_date) continue;
        if (dismissedIds.has(t.id)) continue;
        if (t.due_date < todayStr || (t.due_date === todayStr && t.due_time && t.due_time <= nowTime)) {
          setRingingTask(t);
          playAlarm();
          sendNotification(t);
          break;
        }
      }
    };
    const interval = setInterval(checkAlarms, 15000);
    checkAlarms();
    return () => clearInterval(interval);
  }, [tasks, dismissedIds]);

  const playAlarm = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioRef.current;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880 - i * 100;
        osc.type = 'sine';
        const start = ctx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.25);
      }
    } catch { /* audio not available */ }
  };

  const sendNotification = (t: Task) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Task Reminder', { body: t.title + (t.due_time ? ` at ${t.due_time}` : ''), icon: '/Ref_Hub_logo.png' });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => { requestNotificationPermission(); }, []);

  const toggle = async (t: Task) => {
    const { error: updateError } = await supabase.from('tasks').update({ completed: !t.completed }).eq('id', t.id);
    if (updateError) { setError('Failed to update task.'); return; }
    load();
  };

  const toggleReminder = async (t: Task) => {
    const { error: updateError } = await supabase.from('tasks').update({ reminder_enabled: !t.reminder_enabled }).eq('id', t.id);
    if (updateError) { setError('Failed to toggle reminder.'); return; }
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    const { error: delError } = await supabase.from('tasks').delete().eq('id', id);
    if (delError) { setError('Failed to delete task.'); return; }
    load();
  };

  const dismissAlarm = () => {
    if (ringingTask) {
      setDismissedIds(prev => new Set(prev).add(ringingTask.id));
    }
    setRingingTask(null);
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = filter === 'all' ? tasks : filter === 'due' ? tasks.filter(t => !t.completed && (!t.due_date || t.due_date <= today)) : tasks.filter(t => t.completed);
  const counts = { all: tasks.length, due: tasks.filter(t => !t.completed && (!t.due_date || t.due_date <= today)).length, completed: tasks.filter(t => t.completed).length };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Alarm banner */}
      {ringingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={dismissAlarm} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-rose-100">
                <AlarmClock className="h-8 w-8 text-rose-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Task Reminder</h2>
              <p className="mt-2 text-sm text-slate-600">{ringingTask.title}</p>
              {ringingTask.description && <p className="mt-1 text-xs text-slate-400">{ringingTask.description}</p>}
              {ringingTask.due_time && <p className="mt-2 text-sm font-semibold text-rose-600">Due at {ringingTask.due_time}</p>}
              <div className="mt-5 flex w-full gap-2">
                <button onClick={dismissAlarm} className="btn-ghost flex-1">Dismiss</button>
                <button onClick={() => { toggle(ringingTask); dismissAlarm(); }} className="btn-primary flex-1"><Check className="h-4 w-4" /> Mark Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Tasks & Reminders</h2>
          <p className="mt-1 text-sm text-slate-500">{counts.due} due, {counts.completed} completed</p>
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
          <button onClick={() => { setEditingTask(null); setShowAdd(true); }} disabled={!effectiveAgencyId} className="btn-primary"><Plus className="h-4 w-4" /> Add Task</button>
        </div>
      </div>

      {!effectiveAgencyId && !profile?.is_platform_admin && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">You need to be associated with an agency to create tasks. Please complete onboarding first.</div>
      )}
      {!effectiveAgencyId && profile?.is_platform_admin && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Select an agency above to view and manage its tasks.</div>
      )}

      {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'due', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {f === 'all' ? 'All' : f === 'due' ? 'Due' : 'Completed'} ({counts[f]})
          </button>
        ))}
      </div>

      {loading && <p className="py-12 text-center text-sm text-slate-400">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <div className="card p-8 text-center sm:p-12"><CheckSquare className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">No tasks yet</p><p className="mt-1 text-xs text-slate-400">Create follow-up reminders with alarms, share tasks, and track recurring outreach.</p></div>
      )}

      {/* Task cards */}
      <div className="grid gap-2 sm:gap-3">
        {filtered.map(t => {
          const overdue = !t.completed && t.due_date && t.due_date < today;
          const dueToday = !t.completed && t.due_date === today;
          return (
            <div key={t.id} className={`card group p-3 sm:p-4 ${t.completed ? 'opacity-60' : ''} ${overdue ? 'ring-rose-200' : ''}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggle(t)} className="mt-0.5 flex-shrink-0">
                  {t.completed ? <Check className="h-5 w-5 text-emerald-600" /> : <div className="h-5 w-5 rounded-md border-2 border-slate-300 hover:border-brand-500" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${t.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {t.due_date && (
                      <span className={`badge ${overdue ? 'bg-rose-50 text-rose-700' : dueToday ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Calendar className="h-3 w-3" />{new Date(t.due_date + 'T00:00').toLocaleDateString()}
                      </span>
                    )}
                    {t.due_time && (
                      <span className={`badge ${overdue || dueToday ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        <Clock className="h-3 w-3" />{t.due_time}
                      </span>
                    )}
                    <span className={`badge ${t.priority === 'Urgent' ? 'bg-rose-50 text-rose-700' : t.priority === 'High' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}><Flag className="h-3 w-3" />{t.priority}</span>
                    {t.recurring && <span className="badge bg-brand-50 text-brand-700">{t.recurring}</span>}
                    {t.reminder_enabled && t.due_date && !t.completed && (
                      <span className="badge bg-emerald-50 text-emerald-700"><Bell className="h-3 w-3" /> Alarm on</span>
                    )}
                    {!t.reminder_enabled && t.due_date && !t.completed && (
                      <span className="badge bg-slate-100 text-slate-400"><BellOff className="h-3 w-3" /> Alarm off</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons row — always visible on mobile, hover on desktop */}
              <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:border-t-0 sm:pt-0">
                <button onClick={() => toggleReminder(t)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title={t.reminder_enabled ? 'Disable alarm' : 'Enable alarm'}>
                  {t.reminder_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
                <button onClick={() => { setEditingTask(t); setShowAdd(true); }} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Edit task">
                  <Pencil className="h-4 w-4" />
                </button>
                <ShareMenu task={t} />
                <button onClick={() => del(t.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete task">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && effectiveAgencyId && (
        <TaskModal
          agencyId={effectiveAgencyId}
          existingTask={editingTask}
          onClose={() => { setShowAdd(false); setEditingTask(null); }}
          onSaved={() => { setShowAdd(false); setEditingTask(null); load(); }}
        />
      )}
    </div>
  );
}

function ShareMenu({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);

  const shareText = `Task: ${task.title}${task.description ? '\n${task.description}' : ''}${task.due_date ? `\nDue: ${new Date(task.due_date + 'T00:00').toLocaleDateString()}` : ''}${task.due_time ? ` at ${task.due_time}` : ''}${task.priority ? `\nPriority: ${task.priority}` : ''}`;
  const shareSubject = `Task Reminder: ${task.title}`;

  const shareViaEmail = () => {
    const body = encodeURIComponent(shareText);
    const subject = encodeURIComponent(shareSubject);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setOpen(false);
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`);
    setOpen(false);
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
    setOpen(false);
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shareSubject, text: shareText }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('Task details copied to clipboard.');
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Share task">
        <Share2 className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-1 w-44 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 animate-fade-in">
            <button onClick={shareViaEmail} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Mail className="h-3.5 w-3.5" /> Email</button>
            <button onClick={shareViaSMS} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><MessageSquare className="h-3.5 w-3.5" /> Text Message</button>
            <button onClick={shareViaWhatsApp} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</button>
            <button onClick={shareViaNative} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" /> More / Copy</button>
          </div>
        </>
      )}
    </div>
  );
}

function TaskModal({ agencyId, existingTask, onClose, onSaved }: {
  agencyId: string;
  existingTask: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existingTask?.title || '');
  const [description, setDescription] = useState(existingTask?.description || '');
  const [dueDate, setDueDate] = useState(existingTask?.due_date || '');
  const [dueTime, setDueTime] = useState(existingTask?.due_time || '');
  const [priority, setPriority] = useState(existingTask?.priority || 'Medium');
  const [assignedTo, setAssignedTo] = useState(existingTask?.assigned_to || '');
  const [recurring, setRecurring] = useState(existingTask?.recurring || '');
  const [reminderEnabled, setReminderEnabled] = useState(existingTask?.reminder_enabled ?? true);
  const [relatedCrmId, setRelatedCrmId] = useState(existingTask?.related_crm_id || '');
  const [expanded, setExpanded] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [crmRecords, setCrmRecords] = useState<CrmRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [team, crm] = await Promise.all([
        supabase.from('profiles').select('*').eq('agency_id', agencyId).order('display_name'),
        supabase.from('crm_records').select('id, notes, organization:organizations(name)').eq('agency_id', agencyId).order('updated_at', { ascending: false }).limit(50),
      ]);
      setTeamMembers((team.data as Profile[]) || []);
      setCrmRecords((crm.data as unknown as CrmRecord[]) || []);
    })();
  }, [agencyId]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      agency_id: agencyId,
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate || null,
      due_time: dueTime || null,
      reminder_enabled: reminderEnabled,
      priority,
      assigned_to: assignedTo || null,
      recurring: recurring,
      related_crm_id: relatedCrmId || null,
    };
    let result;
    if (existingTask) {
      result = await supabase.from('tasks').update(payload).eq('id', existingTask.id);
    } else {
      result = await supabase.from('tasks').insert(payload);
    }
    setSaving(false);
    if (result.error) {
      setError('Failed to save task. Please try again.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-fade-in sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{existingTask ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Call hospital social work" autoFocus />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details about this task..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Due Date</label>
                <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Due Time</label>
                <input type="time" className="input" value={dueTime} onChange={e => setDueTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Priority</label>
                <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Recurring</label>
                <select className="input" value={recurring} onChange={e => setRecurring(e.target.value)}>
                  <option value="">None</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </div>
            </div>

            {/* Reminder toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Alarm Reminder</p>
                  <p className="text-xs text-slate-500">{dueDate && dueTime ? `Rings on ${new Date(dueDate + 'T00:00').toLocaleDateString()} at ${dueTime}` : 'Set a date and time to enable the alarm'}</p>
                </div>
              </div>
              <button
                onClick={() => setReminderEnabled(!reminderEnabled)}
                disabled={!dueDate || !dueTime}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${reminderEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${reminderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Expandable advanced section */}
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">
              <span>Assignment & CRM Link</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded && (
              <div className="space-y-3">
                <div>
                  <label className="label">Assign To</label>
                  <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.display_name} ({m.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Related CRM Source</label>
                  <select className="input" value={relatedCrmId} onChange={e => setRelatedCrmId(e.target.value)}>
                    <option value="">None</option>
                    {crmRecords.map(r => {
                      const orgName = (r as unknown as { organization?: { name?: string } }).organization?.name;
                      return <option key={r.id} value={r.id}>{orgName || 'Unknown'}</option>;
                    })}
                  </select>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {existingTask ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
