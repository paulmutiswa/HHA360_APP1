import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Search, Building2, Users, FileText, Bot,
  UserCog, ClipboardCheck, CheckSquare, BarChart3, Rocket, Settings,
  Menu, X, LogOut, Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type Page =
  | 'dashboard' | 'find' | 'directory' | 'crm' | 'templates'
  | 'assistant' | 'employees' | 'compliance' | 'tasks' | 'analytics'
  | 'roadmap' | 'settings' | 'admin';

interface NavItem { id: Page; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'find', label: 'Find Referrals', icon: Search },
  { id: 'directory', label: 'Directory', icon: Building2 },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'assistant', label: 'HHA360 Assistant', icon: Bot },
  { id: 'employees', label: 'Employees', icon: UserCog },
  { id: 'compliance', label: 'Compliance', icon: ClipboardCheck },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'roadmap', label: 'Startup Roadmap', icon: Rocket },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV: Page[] = ['dashboard', 'find', 'directory', 'crm', 'tasks'];

export default function Layout({ page, onPage, children }: { page: Page; onPage: (p: Page) => void; children: ReactNode }) {
  const { profile, agency, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = profile?.is_platform_admin;

  const navItems = isAdmin
    ? [...NAV.filter(n => !['employees', 'compliance', 'roadmap'].includes(n.id)), { id: 'admin' as Page, label: 'Admin Portal', icon: Shield, adminOnly: true }]
    : NAV;

  const currentLabel = navItems.find(n => n.id === page)?.label || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <img src="/Ref_Hub_logo.png" alt="HHA360" className="h-9 w-9 rounded-xl object-contain" />
          <div>
            <p className="text-sm font-bold text-slate-900">HHA360</p>
            <p className="text-[10px] text-slate-400">Start. Operate. Connect. Grow.</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => onPage(item.id)}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {profile?.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">{profile?.display_name || 'User'}</p>
              <p className="truncate text-[10px] text-slate-400">{agency?.name || 'No agency'}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-ghost w-full text-xs">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/Ref_Hub_logo.png" alt="HHA360" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-bold">HHA360</span>
        </div>
        <button onClick={() => setMobileOpen(v => !v)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/30" />
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-4">
              <p className="text-sm font-bold">{profile?.display_name}</p>
              <p className="text-xs text-slate-400">{agency?.name}</p>
            </div>
            <nav className="px-3 py-2">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => { onPage(item.id); setMobileOpen(false); }}
                    className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${page === item.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                );
              })}
              <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Page header bar */}
        <header className="hidden border-b border-slate-200 bg-white px-6 py-3.5 lg:block">
          <h2 className="text-lg font-bold text-slate-900">{currentLabel}</h2>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-20 pt-16 sm:px-6 lg:pb-6 lg:pt-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
          {MOBILE_NAV.map(id => {
            const item = NAV.find(n => n.id === id)!;
            const Icon = item.icon;
            const active = page === id;
            return (
              <button key={id} onClick={() => onPage(id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                <Icon className="h-5 w-5" />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
