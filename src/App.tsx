import React, { useState, useEffect } from 'react';
import {
  Member,
  Culto,
  MonthlyScale,
  MinisterialRole,
  DEFAULT_ROLE_QUOTAS
} from './types/index.ts';
import { api, getStoredSession, setStoredSession, UserSession } from './api.ts';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { HomeView } from './views/HomeView.tsx';
import { AvailabilityView } from './views/AvailabilityView.tsx';
import { ScaleView } from './views/ScaleView.tsx';
import { MyParticipationsView } from './views/MyParticipationsView.tsx';
import { CultosView } from './views/CultosView.tsx';
import { MembersView } from './views/MembersView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { Music, WifiOff, Heart } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [session, setSession] = useState<UserSession | null>(getStoredSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // App data
  const [members, setMembers] = useState<Array<Member & { hasPin?: boolean }>>([]);
  const [cultos, setCultos] = useState<Culto[]>([]);
  const [scales, setScales] = useState<MonthlyScale[]>([]);
  const [roleQuotas, setRoleQuotas] = useState<Record<MinisterialRole, number>>(DEFAULT_ROLE_QUOTAS);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }

    loadInitialData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [bootstrap, membersList] = await Promise.all([
        api.getBootstrap(),
        api.getMembers()
      ]);

      setCultos(bootstrap.cultos || []);
      setScales(bootstrap.scales || []);
      if (bootstrap.roleQuotas) {
        setRoleQuotas(bootstrap.roleQuotas);
      }
      setMembers(membersList || []);

      // If user session is stored, synchronize current member object
      const currentStored = getStoredSession();
      if (currentStored?.member) {
        const fresh = membersList.find((m) => m.id === currentStored.member?.id);
        if (fresh) {
          const updatedSession = { ...currentStored, member: fresh };
          setSession(updatedSession);
          setStoredSession(updatedSession);
        }
      }
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setStoredSession(newSession);
    loadInitialData();
  };

  const handleLogout = () => {
    api.logout();
    setSession(null);
    setCurrentTab('home');
  };

  const handleMemberUpdated = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m))
    );
    if (session?.member?.id === updatedMember.id) {
      const nextSession = { ...session, member: updatedMember };
      setSession(nextSession);
      setStoredSession(nextSession);
    }
  };

  const handleCultosUpdated = async () => {
    try {
      const updated = await api.getCultos();
      setCultos(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScalesUpdated = async () => {
    try {
      const updated = await api.getScales();
      setScales(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMembersUpdated = async () => {
    try {
      const updated = await api.getMembers();
      setMembers(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline: Visualizando dados armazenados no dispositivo.</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-bounce mb-3 shadow-lg">
              <Music className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Carregando Ministério de Louvor...
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <HomeView
                session={session}
                onNavigate={setCurrentTab}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onMemberUpdated={handleMemberUpdated}
                cultos={cultos}
                scales={scales}
                membersCount={members.length}
              />
            )}

            {currentTab === 'availability' && (
              <AvailabilityView
                session={session}
                cultos={cultos}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onMemberUpdated={handleMemberUpdated}
              />
            )}

            {currentTab === 'scale' && (
              <ScaleView
                session={session}
                scales={scales}
                cultos={cultos}
                members={members}
                onScaleUpdated={handleScalesUpdated}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {currentTab === 'my-participations' && session?.member && (
              <MyParticipationsView
                member={session.member}
                scales={scales}
                cultos={cultos}
              />
            )}

            {currentTab === 'cultos' && (
              <CultosView cultos={cultos} onCultosUpdated={handleCultosUpdated} />
            )}

            {currentTab === 'members' && (
              <MembersView members={members} onMembersUpdated={handleMembersUpdated} />
            )}

            {currentTab === 'reports' && <ReportsView />}

            {currentTab === 'settings' && (
              <SettingsView
                initialQuotas={roleQuotas}
                onQuotasUpdated={setRoleQuotas}
                onRefreshAll={loadInitialData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-500 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              L
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Ministério de Louvor
            </span>
            <span>— 51 Integrantes • Gestão & Escala Justa</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Disponibilidade Mensal</span>
            <span>•</span>
            <span>Geração Inteligente</span>
            <span>•</span>
            <span>PWA Instalável</span>
          </div>
        </div>
      </footer>

      {/* Login / Identification Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        members={members}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
