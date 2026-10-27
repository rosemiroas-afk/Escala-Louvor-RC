import React, { useState } from 'react';
import {
  Search,
  Lock,
  KeyRound,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { Member, getMemberRoles } from '../types/index.ts';
import { UserSession, api } from '../api.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';

interface InitialAccessViewProps {
  members: Array<Member & { hasPin?: boolean; hasCustomPin?: boolean }>;
  onLoginSuccess: (session: UserSession, needsPinSetup?: boolean) => void;
  onOpenAdminLogin: () => void;
  onViewScale: () => void;
}

export const InitialAccessView: React.FC<InitialAccessViewProps> = ({
  members,
  onLoginSuccess,
  onOpenAdminLogin,
  onViewScale
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [enteredPins, setEnteredPins] = useState<Record<string, string>>({});
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  // Filter active members and sort alphabetically
  const activeMembers = members
    .filter((m) => m.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const filteredMembers = activeMembers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handlePinChange = (memberId: string, val: string) => {
    setEnteredPins((prev) => ({ ...prev, [memberId]: val }));
    if (errors[memberId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
    }
  };

  const togglePinVisibility = (memberId: string) => {
    setVisiblePins((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleMemberLogin = async (e: React.FormEvent, member: Member) => {
    e.preventDefault();
    const pin = (enteredPins[member.id] || '').trim();

    if (!pin) {
      setErrors((prev) => ({
        ...prev,
        [member.id]: 'Digite o PIN (padrão inicial: 1234)'
      }));
      return;
    }

    setLoadingMemberId(member.id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });

    try {
      const res = await api.loginMember(member.id, pin);
      onLoginSuccess(
        {
          userType: 'integrante',
          roleLevel: res.roleLevel,
          member: res.member,
          token: res.token
        },
        res.needsPinSetup
      );
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [member.id]: err.message || 'PIN incorreto. Padrão inicial: 1234'
      }));
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header Card with Church Identity */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-sky-800/40">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="./logo-igreja.png"
              alt="Logo Igreja Rasgando os Céus Bauru"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = './logo-igreja.jpg';
              }}
            />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-amber-300 text-xs font-bold border border-sky-400/30 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Igreja Rasgando os Céus — Bauru</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Painel de Escala
              </h1>
              <p className="text-xs sm:text-sm text-sky-200 font-light mt-0.5">
                Acesso dos 51 integrantes do Ministério de Louvor
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
            <button
              onClick={onViewScale}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Ver Escala Publicada</span>
            </button>

            <button
              onClick={onOpenAdminLogin}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Painel do Líder</span>
            </button>
          </div>
        </div>
      </div>

      {/* PIN Instructions Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
        <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Como acessar o sistema:
          </p>
          <ul className="text-xs space-y-0.5 text-amber-800 dark:text-amber-300 list-disc list-inside">
            <li>
              Cada um possui a <strong>senha padrão inicial 1234</strong>.
            </li>
            <li>
              Localize seu nome na lista abaixo e digite <strong>1234</strong> para entrar.
            </li>
            <li>
              Ao entrar pela primeira vez, você criará o seu <strong>PIN individual</strong> para usar sempre.
            </li>
            <li>
              Caso esqueça seu PIN, peça ao administrador para <strong>resetar para o padrão 1234</strong>.
            </li>
          </ul>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Digite seu nome para encontrar rapidamente (ex: MIRO, DANI, LUCAS)..."
          className="w-full pl-12 pr-10 py-3.5 text-sm sm:text-base rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 shadow-xs outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Members count indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Mostrando <strong>{filteredMembers.length}</strong> de {activeMembers.length} integrantes
        </span>
        <span className="text-[11px]">
          Clique no seu nome ou digite o PIN abaixo
        </span>
      </div>

      {/* Grid of 51 Members with Name and PIN directly underneath */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredMembers.map((m) => {
          const roles = getMemberRoles(m);
          const hasCustom = Boolean(m.hasCustomPin || (m.pin && m.pin !== '1234'));
          const currentPin = enteredPins[m.id] || '';
          const isVisible = Boolean(visiblePins[m.id]);
          const errorMsg = errors[m.id];
          const isLoading = loadingMemberId === m.id;

          return (
            <div
              key={m.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-300 dark:hover:border-sky-700 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3"
            >
              {/* Member Name and Badges */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => {
                      const input = document.getElementById('pin-input-' + m.id) as HTMLInputElement | null;
                      input?.focus();
                    }}
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition"
                    title={`Clique para selecionar ${m.name} e digitar o PIN`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {m.name[0]}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                        {m.name}
                      </h3>
                      {m.roleLevel === 'admin' && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          Liderança / Administrador
                        </span>
                      )}
                    </div>
                  </div>

                  {hasCustom ? (
                    <span
                      title="Senha individual cadastrada"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0"
                    >
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span>PIN Pessoal</span>
                    </span>
                  ) : (
                    <span
                      title="Senha padrão inicial 1234"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 shrink-0"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      <span>Padrão: 1234</span>
                    </span>
                  )}
                </div>

                {/* Assigned Roles Badges */}
                {roles.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <RoleBadge key={role} role={role} size="sm" />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400 italic">
                    Função ainda não selecionada
                  </p>
                )}
              </div>

              {/* PIN Form Directly Underneath Name */}
              <form
                onSubmit={(e) => handleMemberLogin(e, m)}
                className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Código PIN de Acesso:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {hasCustom ? 'Use seu PIN pessoal' : 'Senha padrão: 1234'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id={'pin-input-' + m.id}
                      type={isVisible ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={8}
                      value={currentPin}
                      onChange={(e) => handlePinChange(m.id, e.target.value)}
                      placeholder={hasCustom ? 'Digite seu PIN' : 'Padrão: 1234'}
                      className="w-full pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => togglePinVisibility(m.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={isVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {errorMsg && (
                  <div className="mt-1.5 p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-[11px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </form>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Nenhum integrante encontrado com o nome "{searchTerm}".
          </p>
          <p className="text-xs text-slate-400">
            Verifique a grafia ou limpe o campo de busca para exibir todos os 51 integrantes.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 mt-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition cursor-pointer"
          >
            Limpar Busca
          </button>
        </div>
      )}
    </div>
  );
};
