import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Download,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../api.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';

export const ReportsView: React.FC = () => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedMonth]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats(selectedMonth);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!stats?.memberStats) return;

    const headers = [
      'Integrante',
      'Funcao',
      'Respondeu',
      'Cultos Disponiveis',
      'Cultos Indisponiveis',
      'Vezes Escalado',
      'Disponivel Nao Escalado'
    ];

    const rows = stats.memberStats.map((m: any) => [
      `"${m.name}"`,
      `"${m.role}"`,
      m.hasResponded ? 'Sim' : 'Nao',
      m.availableCount,
      m.unavailableCount,
      m.scheduledCount,
      m.timesAvailableNotScheduled
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r: any) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_participacoes_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Painel Administrativo & Relatórios
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Métricas de preenchimento, justiça na distribuição e adesão dos integrantes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-2"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando métricas...</div>
      ) : !stats ? (
        <div className="p-12 text-center text-xs text-slate-400">Dados indisponíveis.</div>
      ) : (
        <>
          {/* Key Metric Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Integrantes Ativos
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.totalActiveMembers}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  Total
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Respostas de Disponibilidade
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {stats.membersRespondedCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {stats.membersNotRespondedCount} pendentes
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${
                      stats.totalActiveMembers > 0
                        ? (stats.membersRespondedCount / stats.totalActiveMembers) * 100
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Vagas Preenchidas
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {stats.filledVacancies}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  em {stats.totalCultosInMonth} cultos
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Vagas Não Preenchidas
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-2xl font-black ${
                    stats.unfilledVacancies > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {stats.unfilledVacancies}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Não bloqueia</span>
              </div>
            </div>
          </div>

          {/* Unallocated available members */}
          {stats.unallocatedMembers && stats.unallocatedMembers.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Disponíveis Não Escalados ({stats.unallocatedMembers.length} pessoas)
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
                Identificados pelo algoritmo de justiça na distribuição. O administrador pode avaliar e ajustar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {stats.unallocatedMembers.map((u: any) => (
                  <div
                    key={u.memberId}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{u.memberName}</span>
                      <RoleBadge role={u.role} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{u.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed distribution fairness table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Distribuição Equilibrada por Integrante
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhamento de participações no mês para evitar sobrecarga e garantir oportunidades a todos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Integrante</th>
                    <th className="py-3 px-4">Função</th>
                    <th className="py-3 px-4 text-center">Respondeu?</th>
                    <th className="py-3 px-4 text-center">Disponível</th>
                    <th className="py-3 px-4 text-center">Indisponível</th>
                    <th className="py-3 px-4 text-center">Escalado</th>
                    <th className="py-3 px-4 text-center">Disponível s/ Escalar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.memberStats.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="py-3 px-4">
                        <RoleBadge role={m.role} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.hasResponded ? (
                          <span className="inline-flex items-center text-emerald-600 font-bold text-[11px]">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-400 text-[11px]">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {m.availableCount}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {m.unavailableCount}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-indigo-600 dark:text-indigo-400">
                        {m.scheduledCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.timesAvailableNotScheduled > 0 ? (
                          <span className="font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            {m.timesAvailableNotScheduled}x
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
