import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import OnboardingScreen from '@/components/OnboardingScreen';
import Layout, { type Page } from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import FindReferrals from '@/components/FindReferrals';
import Directory from '@/components/Directory';
import OrgProfile from '@/components/OrgProfile';
import CRM from '@/components/CRM';
import Templates from '@/components/Templates';
import AIAssistant from '@/components/AIAssistant';
import Employees from '@/components/Employees';
import Tasks from '@/components/Tasks';
import Analytics from '@/components/Analytics';
import StartupRoadmap from '@/components/StartupRoadmap';
import Settings from '@/components/Settings';
import AdminPortal from '@/components/AdminPortal';
import type { Organization } from '@/lib/types';

function AppContent() {
  const { session, profile, loading, needsOnboarding } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-400">Loading HHA360...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  if (needsOnboarding) return <OnboardingScreen />;

  const isAdmin = profile?.is_platform_admin;
  const showAdmin = isAdmin && page === 'admin';

  return (
    <>
      <Layout page={page} onPage={setPage}>
        {page === 'dashboard' && <Dashboard onPage={setPage} />}
        {page === 'find' && <FindReferrals onSelectOrg={setSelectedOrg} />}
        {page === 'directory' && <Directory onSelectOrg={setSelectedOrg} />}
        {page === 'crm' && <CRM onSelectOrg={setSelectedOrg} />}
        {page === 'templates' && <Templates />}
        {page === 'assistant' && <AIAssistant />}
        {page === 'employees' && <Employees />}
        {page === 'compliance' && <Employees />}
        {page === 'tasks' && <Tasks />}
        {page === 'analytics' && <Analytics />}
        {page === 'roadmap' && <StartupRoadmap />}
        {page === 'settings' && <Settings />}
        {showAdmin && <AdminPortal onPage={setPage} />}
      </Layout>

      {selectedOrg && (
        <OrgProfile
          org={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onAddToCrm={() => setPage('crm')}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
