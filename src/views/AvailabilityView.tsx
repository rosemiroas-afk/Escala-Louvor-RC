import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight
} from 'lucide-react';
import { Culto, Member, MinisterialRole, Availability, ALL_ROLES, getMemberRoles } from '../types/index.ts';
import { UserSession, api } from '../api.ts';
import { RoleBadge, MemberRolesBadges } from '../components/RoleBadge.tsx';

interface AvailabilityViewProps {
  session: UserSession | null;
  cultos: Culto[];
  onOpenLogin: () => void;
  onMemberUpdated: (m: Member) => void;
}

export const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  session,
  cultos,
  onOpenLogin,
  onMemberUpdated
}) => {
  // Current month in YYYY-MM
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [availabilitiesMap, setAvailabilitiesMap] = useState<Record<string, 'disponivel' | 'indisponivel'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // If member has no role yet, they can choose here too
  const [selectedRole, setSelectedRole] = useState<MinisterialRole | null>(
    session?.member?.primaryRole || null
  );

  // Filter cultos by selected month
  const monthCultos = cultos
    .filter((c) => c.date.startsWith(selectedMonth))
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.time.localeCompare(b.time);
    });

  // Load existing availabilities for current member
  useEffect(() => {
    if (session?.member) {
      loadMemberAvailabilities();
    }
  }, [session?.member?.id, selectedMonth]);

  const loadMemberAvailabilities = async () => {
    if (!session?.member) return;
    setLoading(true);
    try {
      const data = await api.getAvailabilities(selectedMonth, session.member.id);
      const map: Record<string, 'disponivel' | 'indisponivel'> = {};
      data.forEach((item) => {
        if (item.status === 'disponivel' || item.status === 'indisponivel') {
          map[item.cultoId] = item.status;
        }
      });
      setAvailabilitiesMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (cultoId: string, status: 'disponivel' | 'indisponivel') => {
    setAvailabilitiesMap((prev) => ({
      ...prev,
      [cultoId]: prev[cultoId] === status ? (undefined as any) : status
    }));
  };

  const handleSelectAll = (status: 'disponivel' | 'indisponivel') => {
    const next: Record<string, 'disponivel' | 'indisponivel'> = {};
    monthCultos.forEach((c) => {
      next[c.id] = status;
    });
    setAvailabilitiesMap(next);
  };

  const handleSave = async () => {
    if (!session?.member) {
      onOpenLogin();
      return;
    }

    if (getMemberRoles(session.member).length === 0) {
      setMessage({
        text: 'Por favor, escolha ao menos uma função ministerial antes de salvar sua disponibilidade.',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const items: Array<{ cultoId: string; status: 'disponivel' | 'indisponivel' }> = [];
      for (const culto of monthCultos) {
        const st = availabilitiesMap[culto.id];
        if (st) {
          items.push({ cultoId: culto.id, status: st });
        }
      }

      await api.saveAvailabilities(session.member.id, items);
      setMessage({
        text: 'Disponibilidade salva com sucesso! Os líderes poderão gerar a escala com suas datas confirmadas.',
        type: 'success'
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Erro ao salvar disponibilidade.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (role: MinisterialRole) => {
    if (!session?.member) return;
    const current = getMemberRoles(session.member);
    const exists = current.includes(role);
    const updated = exists ? current.filter((r) => r !== role) : [...current, role];
    try {
      const res = await api.updateMemberRole(session.member.id, updated);
      onMemberUpdated(res.member);
      setMessage({
        text:
          updated.length > 0
            ? `Funções atualizadas (${updated.length} ativa(s)): ${updated.join(', ')}`
            : 'Nenhuma função selecionada. Escolha ao menos uma função.',
        type: 'success'
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Helper for formatting date (ex: "Domingo, 01 de Novembro")
  const formatDateBR = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  if (!session?.member) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-sm my-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Identifique-se para preencher
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Cada um dos 51 integrantes possui sua própria área de disponibilidade. Selecione seu nome para continuar.
        </p>
        <button
          onClick={onOpenLogin}
          className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Acessar com meu nome</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Count availability responses
  const totalCultos = monthCultos.length;
  const answeredCount = Object.keys(availabilitiesMap).filter((id) =>
    monthCultos.some((c) => c.id === id)
  ).length;
  const availableCount = Object.values(availabilitiesMap).filter((v) => v === 'disponivel').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Minha Disponibilidade
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {session.member.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Indique os cultos em que você pode ou não adorar e ministrar no louvor.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-2"
          />
        </div>
      </div>

      {/* Function / Role Alert */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Suas Funções Ministeriais
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                Selecione quantas quiser
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              A escala inteligente poderá escalar você em qualquer uma das funções selecionadas:
            </p>
          </div>
        </div>

        {/* Multi-role selection pills/buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_ROLES.map((role) => {
            const isSelected = getMemberRoles(session.member).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleToggleRole(role)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>{role}</span>
                <span
                  className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                    isSelected
                      ? 'bg-white text-indigo-600 font-extrabold'
                      : 'border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {getMemberRoles(session.member).length === 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Atenção:</strong> Selecione pelo menos uma função acima antes de salvar a disponibilidade.
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span>
            Respondidos: <strong>{answeredCount}</strong> de <strong>{totalCultos}</strong> cultos
          </span>
          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-600">|</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {availableCount} Disponível
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectAll('disponivel')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition cursor-pointer"
          >
            Disponível em Todos
          </button>
          <button
            type="button"
            onClick={() => handleSelectAll('indisponivel')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
          >
            Indisponível em Todos
          </button>
        </div>
      </div>

      {/* Cultos list */}
      {monthCultos.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-12 text-center border border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhum culto cadastrado para este mês ({selectedMonth})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            A liderança ainda não cadastrou cultos para este período.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {monthCultos.map((culto) => {
            const currentStatus = availabilitiesMap[culto.id];

            return (
              <div
                key={culto.id}
                className={`p-4 rounded-2xl border transition bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  currentStatus === 'disponivel'
                    ? 'border-emerald-300 dark:border-emerald-900/60 shadow-xs'
                    : currentStatus === 'indisponivel'
                    ? 'border-rose-200 dark:border-rose-900/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold ${
                      currentStatus === 'disponivel'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : currentStatus === 'indisponivel'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-tighter">
                      {culto.date.split('-')[2]}
                    </span>
                    <Clock className="w-4 h-4 mt-0.5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {culto.name}
                      </span>
                      {culto.status === 'realizado' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                          Realizado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                      {formatDateBR(culto.date)} • às {culto.time}h
                    </p>
                    {culto.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        "{culto.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(culto.id, 'disponivel')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      currentStatus === 'disponivel'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Disponível</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(culto.id, 'indisponivel')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      currentStatus === 'indisponivel'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Indisponível</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save Bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white flex items-center justify-between shadow-2xl border border-white/10">
        <div className="text-xs">
          <p className="font-bold">Pronto para confirmar?</p>
          <p className="text-slate-300 text-[11px]">
            {answeredCount} cultos respondidos neste mês
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Gravando...' : 'Salvar Disponibilidade'}</span>
        </button>
      </div>
    </div>
  );
};
