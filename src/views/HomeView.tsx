import React, { useState } from 'react';
import {
  Music,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Member, Culto, MonthlyScale, MinisterialRole, ALL_ROLES } from '../types/index.ts';
import { UserSession, api } from '../api.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';
import { NavTab } from '../components/Navbar.tsx';

interface HomeViewProps {
  session: UserSession | null;
  onNavigate: (tab: NavTab) => void;
  onOpenLogin: () => void;
  onMemberUpdated: (member: Member) => void;
  cultos: Culto[];
  scales: MonthlyScale[];
  membersCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  session,
  onNavigate,
  onOpenLogin,
  onMemberUpdated,
  cultos,
  scales,
  membersCount
}) => {
  const [selectedRole, setSelectedRole] = useState<MinisterialRole | ''>(
    session?.member?.primaryRole || ''
  );
  const [savingRole, setSavingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const isAdminOrLeader = session?.roleLevel === 'admin' || session?.roleLevel === 'lider';
  const latestPublishedScale = scales.find((s) => s.status === 'publicada');
  const latestDraftScale = scales.find((s) => s.status === 'em_elaboracao');

  const handleSaveRole = async (role: MinisterialRole) => {
    if (!session?.member) return;
    setSavingRole(true);
    setRoleMessage(null);
    try {
      const res = await api.updateMemberRole(session.member.id, role);
      setSelectedRole(role);
      onMemberUpdated(res.member);
      setRoleMessage(`Função atualizada para ${role} com sucesso!`);
    } catch (err: any) {
      setRoleMessage(`Erro: ${err.message}`);
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-indigo-700/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-5 opacity-10 hidden md:block">
          <Music className="w-48 h-48" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Igreja Evangélica — Gestão Pastoral de Louvor</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Sistema de Escala & Louvor
          </h1>
          <p className="text-sm sm:text-base text-indigo-100 font-light leading-relaxed mb-6">
            "Cantai louvores ao Senhor, que habita em Sião; anunciai entre os povos as suas obras."{' '}
            <span className="font-medium text-amber-300">— Salmos 9:11</span>
          </p>

          {/* User state indicator */}
          {session ? (
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-10 h-10 rounded-full bg-amber-400 text-indigo-950 font-bold flex items-center justify-center shrink-0">
                {session.member ? session.member.name[0] : 'A'}
              </div>
              <div className="flex-1">
                <p className="text-xs text-indigo-200">Bem-vindo(a),</p>
                <p className="text-base font-bold text-white leading-tight">
                  {session.member ? session.member.name : 'Administrador da Liderança'}
                </p>
                {session.member && (
                  <div className="mt-1">
                    <RoleBadge role={session.member.primaryRole} size="sm" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {session.member && (
                  <button
                    onClick={() => onNavigate('availability')}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 transition shadow-sm cursor-pointer"
                  >
                    Minha Disponibilidade
                  </button>
                )}
                {isAdminOrLeader && (
                  <button
                    onClick={() => onNavigate('reports')}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition cursor-pointer"
                  >
                    Painel do Líder
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onOpenLogin}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Acessar com meu Nome</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('scale')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/20 transition cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Consultar Escala do Mês</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role selection prompt if member has no role yet */}
      {session?.member && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Minha Função Ministerial</span>
                {session.member.primaryRole ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session.member.primaryRole
                  ? 'Você pode trocar sua função principal quando desejar:'
                  : 'Atenção: selecione a função que você exerce no ministério de louvor:'}
              </p>
            </div>

            {session.member.primaryRole && (
              <RoleBadge role={session.member.primaryRole} size="lg" />
            )}
          </div>

          {roleMessage && (
            <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{roleMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {ALL_ROLES.map((role) => {
              const isCurrent = session.member?.primaryRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  disabled={savingRole}
                  onClick={() => handleSaveRole(role)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                    isCurrent
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <RoleBadge role={role} size="sm" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {isCurrent ? 'Selecionada' : 'Escolher'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Status and Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Minha Disponibilidade */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Minha Disponibilidade
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Informe os cultos do mês em que você pode ou não participar. A escala automática utiliza suas respostas reais.
            </p>
          </div>

          <button
            onClick={() => {
              if (!session?.member) {
                onOpenLogin();
              } else {
                onNavigate('availability');
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>{session?.member ? 'Abrir meus cultos' : 'Identificar-se e Informar'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Escala do Mês */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Escala do Mês
              </h3>
              {latestPublishedScale ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Publicada
                </span>
              ) : latestDraftScale ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Em elaboração
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Aguardando
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Consulte a programação completa organizada por data e horário, com todos os integrantes e funções preenchidas.
            </p>
          </div>

          <button
            onClick={() => onNavigate('scale')}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>Ver Escala Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Integrantes ou Liderança */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              51 Integrantes Cadastrados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Base oficial compartilhada com os 51 irmãos do Ministério de Louvor. Todos têm acesso pelo celular em tempo real.
            </p>
          </div>

          {isAdminOrLeader ? (
            <button
              onClick={() => onNavigate('members')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Gerenciar Integrantes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Acesso da Liderança</span>
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ministerial Quota Guidelines card */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-5 border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Composição Meta por Culto (Regra do Ministério)
        </h4>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>3</strong> Ministros
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>1</strong> Guitarrista
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>1</strong> Tecladista
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>1</strong> Violonista
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>1</strong> Baterista
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>1</strong> Baixista
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>2</strong> Contraltos
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>2</strong> Sopranos
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <strong>2</strong> Tenores
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Nota: Estas metas nunca bloqueiam a escala. Se faltar integrantes para qualquer função, a escala é gerada e concluída normalmente com aviso informativo.
        </p>
      </div>
    </div>
  );
};
