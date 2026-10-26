import React, { useState } from 'react';
import {
  Settings,
  Save,
  KeyRound,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  FlaskConical,
  HelpCircle
} from 'lucide-react';
import { MinisterialRole, ALL_ROLES } from '../types/index.ts';
import { api } from '../api.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';

interface SettingsViewProps {
  initialQuotas: Record<MinisterialRole, number>;
  onQuotasUpdated: (quotas: Record<MinisterialRole, number>) => void;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialQuotas,
  onQuotasUpdated,
  onRefreshAll
}) => {
  const [quotas, setQuotas] = useState<Record<MinisterialRole, number>>(initialQuotas);
  const [adminPin, setAdminPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [demoActionLoading, setDemoActionLoading] = useState<string | null>(null);

  const handleQuotaChange = (role: MinisterialRole, value: number) => {
    setQuotas((prev) => ({
      ...prev,
      [role]: Math.max(0, value)
    }));
  };

  const handleSaveQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateQuotas(quotas, adminPin.trim() || undefined);
      onQuotasUpdated(quotas);
      setMessage({
        text: 'Configurações de metas de composição salvas com sucesso!',
        type: 'success'
      });
      if (adminPin) setAdminPin('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao salvar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDemoAction = async (action: 'assign_roles' | 'simulate_availability' | 'reset_all') => {
    setDemoActionLoading(action);
    setMessage(null);
    try {
      const res = await api.triggerDemoAction(action);
      setMessage({ text: res.message, type: 'success' });
      onRefreshAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setDemoActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
          Configurações do Ministério
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ajuste as metas de composição por culto, segurança e ferramentas de teste.
        </p>
      </div>

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

      {/* Quotas form */}
      <form onSubmit={handleSaveQuotas} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Metas Desejadas de Integrantes por Culto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lembrete: Estas quantidades representam metas desejadas, não requisitos obrigatórios. A falta de integrantes nunca bloqueia a escala.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ALL_ROLES.map((role) => (
              <div
                key={role}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <RoleBadge role={role} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuotaChange(role, (quotas[role] || 0) - 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                    {quotas[role] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuotaChange(role, (quotas[role] || 0) + 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Admin PIN */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Segurança & PIN Administrativo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Altere o PIN mestre utilizado pela liderança para gerenciar o sistema.
              </p>
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Novo PIN de Administrador (opcional):
            </label>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Deixe em branco para manter o atual"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Gravando...' : 'Salvar Todas as Configurações'}</span>
        </button>
      </form>

      {/* Demo & Test Scenarios Tool */}
      <div className="bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-indigo-950/30 dark:to-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Validação dos 18 Cenários de Teste Obrigatórios
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ferramentas de auxílio para simular e validar rapidamente os cenários descritos na especificação (falta de ministros, sem guitarrista, etc.):
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            disabled={demoActionLoading !== null}
            onClick={() => handleDemoAction('assign_roles')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-slate-700 text-left transition text-xs flex flex-col justify-between gap-1 shadow-xs cursor-pointer"
          >
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              1. Simular Funções
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Atribui as 9 funções entre os 51 integrantes para testes rápidos.
            </span>
          </button>

          <button
            type="button"
            disabled={demoActionLoading !== null}
            onClick={() => handleDemoAction('simulate_availability')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-slate-700 text-left transition text-xs flex flex-col justify-between gap-1 shadow-xs cursor-pointer"
          >
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              2. Simular Disponibilidades
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Marca disponibilidades realistas nos cultos do mês.
            </span>
          </button>

          <button
            type="button"
            disabled={demoActionLoading !== null}
            onClick={() => handleDemoAction('reset_all')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-slate-700 text-left transition text-xs flex flex-col justify-between gap-1 shadow-xs cursor-pointer"
          >
            <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              3. Resetar ao Padrão
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Restaura os 51 nomes limpos sem função, pronto para produção.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
