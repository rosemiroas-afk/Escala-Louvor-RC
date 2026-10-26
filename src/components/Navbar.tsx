import React, { useState } from 'react';
import {
  Music,
  Calendar,
  Users,
  BarChart3,
  Settings,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { UserSession } from '../api.ts';
import { RoleBadge } from './RoleBadge.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export type NavTab =
  | 'home'
  | 'availability'
  | 'scale'
  | 'my-participations'
  | 'cultos'
  | 'members'
  | 'reports'
  | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: UserSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  unfilledDraftCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  session,
  onOpenLogin,
  onLogout,
  unfilledDraftCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminOrLeader = session?.roleLevel === 'admin' || session?.roleLevel === 'lider';

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; adminOnly?: boolean }> = [
    { id: 'home', label: 'Início', icon: <Music className="w-4 h-4" /> },
    { id: 'availability', label: 'Minha Disponibilidade', icon: <Calendar className="w-4 h-4" /> },
    { id: 'scale', label: 'Escala do Mês', icon: <Clock className="w-4 h-4" /> },
    ...(session?.member
      ? [{ id: 'my-participations' as NavTab, label: 'Meus Cultos', icon: <User className="w-4 h-4" /> }]
      : []),
    { id: 'cultos', label: 'Cultos', icon: <Calendar className="w-4 h-4" />, adminOnly: true },
    { id: 'members', label: 'Integrantes (51)', icon: <Users className="w-4 h-4" />, adminOnly: true },
    { id: 'reports', label: 'Painel & Relatórios', icon: <BarChart3 className="w-4 h-4" />, adminOnly: true },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" />, adminOnly: true }
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdminOrLeader);

  const handleNav = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNav('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                  Ministério de Louvor
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  ESCALA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden xs:block">
                Gestão Compartilhada & Distribuição Justa
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {session ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition text-left"
                  title="Trocar usuário"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {session.member ? session.member.name[0] : 'A'}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {session.member ? session.member.name : 'Administrador'}
                    </p>
                    {session.member ? (
                      <RoleBadge role={session.member.primaryRole} size="sm" />
                    ) : (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Liderança
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                  title="Sair do perfil"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Identificar-se</span>
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-6 space-y-1 shadow-lg">
          {session && (
            <div className="p-3 mb-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Conectado como:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {session.member ? session.member.name : 'Administrador da Liderança'}
                </p>
                {session.member && <RoleBadge role={session.member.primaryRole} size="sm" />}
              </div>
              <button
                onClick={onOpenLogin}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Trocar
              </button>
            </div>
          )}

          {visibleItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
