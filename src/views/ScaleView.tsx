import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Share2,
  Printer,
  Download,
  Edit3,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
  FileSpreadsheet,
  Bell,
  Loader2,
  HandHeart
} from 'lucide-react';
import {
  MonthlyScale,
  Culto,
  Member,
  ScaleParticipation,
  MinisterialRole,
  ALL_ROLES,
  SubstitutionRequest
} from '../types/index.ts';
import { UserSession, api } from '../api.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';
import { BatchImportCultosModal } from '../components/BatchImportCultosModal.tsx';
import { RequestSubstitutionModal } from '../components/RequestSubstitutionModal.tsx';

interface ScaleViewProps {
  session: UserSession | null;
  scales: MonthlyScale[];
  cultos: Culto[];
  members: Member[];
  onScaleUpdated: () => void;
  onCultosUpdated?: () => void;
  onOpenLogin: () => void;
}

export const ScaleView: React.FC<ScaleViewProps> = ({
  session,
  scales,
  cultos,
  members,
  onScaleUpdated,
  onCultosUpdated,
  onOpenLogin
}) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  // Substitutions state
  const [substitutions, setSubstitutions] = useState<SubstitutionRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeSubModal, setActiveSubModal] = useState<{
    participationId: string;
    cultoId: string;
    cultoName: string;
    cultoDate: string;
    cultoTime: string;
    role: MinisterialRole;
    currentMemberName: string;
  } | null>(null);

  // Batch import modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Manual Edit Modal state
  const [editingCultoId, setEditingCultoId] = useState<string | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<Member[]>([]);
  const [targetSlot, setTargetSlot] = useState<{
    participationId?: string;
    role: MinisterialRole;
    cultoId: string;
    currentMemberId?: string | null;
  } | null>(null);

  const isAdminOrLeader = session?.roleLevel === 'admin' || session?.roleLevel === 'lider';

  const loadSubstitutions = async () => {
    try {
      const data = await api.getSubstitutions(selectedMonth);
      setSubstitutions(data || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos de substituição:', err);
    }
  };

  useEffect(() => {
    loadSubstitutions();
  }, [selectedMonth]);

  // Find scale for selected month
  const currentScale = scales.find((s) => s.month === selectedMonth);

  // Filter cultos for this month
  const monthCultos = cultos
    .filter((c) => c.date.startsWith(selectedMonth))
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.time.localeCompare(b.time);
    });

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

  const handleGenerate = async () => {
    if (!isAdminOrLeader) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await api.generateScale(selectedMonth);
      setMessage({
        text: 'Escala mensal gerada com sucesso! Você pode revisar os integrantes abaixo e publicar quando estiver pronto.',
        type: 'success'
      });
      onScaleUpdated();
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao gerar escala.', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!currentScale || !isAdminOrLeader) return;
    setPublishing(true);
    setMessage(null);
    try {
      await api.publishScale(currentScale.id);
      setMessage({
        text: 'Escala oficial publicada com sucesso! Agora todos os integrantes podem visualizá-la.',
        type: 'success'
      });
      onScaleUpdated();
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao publicar escala.', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentScale || !isAdminOrLeader) return;
    try {
      await api.unpublishScale(currentScale.id);
      setMessage({
        text: 'Escala retornada para o modo de elaboração.',
        type: 'info'
      });
      onScaleUpdated();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleAcceptSubstitution = async (subId: string) => {
    if (!session) {
      onOpenLogin();
      return;
    }
    setActionLoadingId(subId);
    try {
      await api.acceptSubstitution(subId);
      setMessage({
        text: 'Você assumiu a escala com sucesso! A vaga foi atualizada na escala oficial e a equipe foi notificada.',
        type: 'success'
      });
      await Promise.all([loadSubstitutions(), onScaleUpdated()]);
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao assumir substituição.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSubstitution = async (subId: string) => {
    if (!window.confirm('Deseja realmente cancelar este pedido de substituição?')) return;
    setActionLoadingId(subId);
    try {
      await api.cancelSubstitution(subId);
      setMessage({
        text: 'Pedido de substituição cancelado com sucesso.',
        type: 'info'
      });
      await loadSubstitutions();
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao cancelar pedido.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open candidate selector to replace or assign a member to a slot
  const handleOpenSlotEdit = async (
    cultoId: string,
    role: MinisterialRole,
    participationId?: string,
    currentMemberId?: string | null
  ) => {
    if (!isAdminOrLeader) return;

    // Fetch who is available for this culto and has this role
    try {
      const avails = await api.getAvailabilities(undefined, undefined);
      const availableMemberIds = new Set(
        avails
          .filter((a) => a.cultoId === cultoId && a.status === 'disponivel')
          .map((a) => a.memberId)
      );

      // Members with matching primaryRole who are active
      const matchingMembers = members.filter(
        (m) => m.active && (m.primaryRole === role || availableMemberIds.has(m.id))
      );

      // Sort so available ones appear first
      matchingMembers.sort((a, b) => {
        const aAvail = availableMemberIds.has(a.id) ? 1 : 0;
        const bAvail = availableMemberIds.has(b.id) ? 1 : 0;
        return bAvail - aAvail;
      });

      setCandidateOptions(matchingMembers);
      setTargetSlot({
        participationId,
        role,
        cultoId,
        currentMemberId
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCandidate = async (newMemberId: string | null) => {
    if (!currentScale || !targetSlot) return;

    const currentParticipations = [...currentScale.participations];
    const newMember = newMemberId ? members.find((m) => m.id === newMemberId) : null;

    if (targetSlot.participationId) {
      // Modifying existing slot
      const idx = currentParticipations.findIndex((p) => p.id === targetSlot.participationId);
      if (idx >= 0) {
        if (newMemberId === null) {
          // Leave unfilled
          currentParticipations[idx].memberId = null;
          currentParticipations[idx].memberName = undefined;
          currentParticipations[idx].status = 'vaga_aberta';
        } else {
          currentParticipations[idx].memberId = newMemberId;
          currentParticipations[idx].memberName = newMember?.name || '';
          currentParticipations[idx].status = 'confirmado';
        }
      }
    } else {
      // Adding new participation to this culto
      currentParticipations.push({
        id: `part_${targetSlot.cultoId}_${targetSlot.role}_${Date.now()}`,
        cultoId: targetSlot.cultoId,
        memberId: newMemberId,
        memberName: newMember?.name,
        role: targetSlot.role,
        status: newMemberId ? 'confirmado' : 'vaga_aberta'
      });
    }

    try {
      await api.updateScaleParticipations(currentScale.id, currentParticipations);
      setTargetSlot(null);
      onScaleUpdated();
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar vaga.', type: 'error' });
    }
  };

  const handleRemoveSlot = async (participationId: string) => {
    if (!currentScale) return;
    const updated = currentScale.participations.filter((p) => p.id !== participationId);
    try {
      await api.updateScaleParticipations(currentScale.id, updated);
      onScaleUpdated();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!currentScale) return;

    const rows = [
      ['Data', 'Horario', 'Culto', 'Funcao', 'Integrante', 'Situacao']
    ];

    for (const culto of monthCultos) {
      const parts = currentScale.participations.filter((p) => p.cultoId === culto.id);
      for (const p of parts) {
        rows.push([
          culto.date,
          culto.time,
          `"${culto.name}"`,
          p.role,
          p.memberId && p.memberName ? `"${p.memberName}"` : '"Não preenchida"',
          p.memberId ? 'Escalado' : 'Vaga Aberta'
        ]);
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `escala_louvor_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print View
  const handlePrint = () => {
    window.print();
  };

  // Web Share
  const handleShare = async () => {
    if (!currentScale) return;

    let shareText = `🎵 *ESCALA DO MINISTÉRIO DE LOUVOR — ${selectedMonth}*\n\n`;
    for (const culto of monthCultos) {
      shareText += `📅 *${culto.name.toUpperCase()}*\n`;
      shareText += `🗓️ ${formatDateBR(culto.date)} às ${culto.time}h\n`;

      const parts = currentScale.participations.filter((p) => p.cultoId === culto.id);
      for (const p of parts) {
        if (p.memberId && p.memberName) {
          shareText += `• ${p.role}: ${p.memberName}\n`;
        } else {
          shareText += `• ${p.role}: (Não preenchida)\n`;
        }
      }
      shareText += `\n`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Escala Ministério de Louvor - ${selectedMonth}`,
          text: shareText
        });
      } catch (e) {
        // user cancelled or share failed
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setMessage({
        text: 'Escala em texto formatado copiada para a área de transferência! Cole no WhatsApp da equipe.',
        type: 'success'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Escala do Mês
            </h1>
            {currentScale?.status === 'publicada' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Oficial Publicada</span>
              </span>
            ) : currentScale?.status === 'em_elaboracao' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Em Elaboração (Rascunho)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Aguardando Geração
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualização completa dos cultos, horários, equipe escalada e posições vagas.
          </p>
        </div>

        {/* Toolbar & Month */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-2"
            />
          </div>

          {currentScale && (
            <>
              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Compartilhar escala (WhatsApp / Redes)"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportCSV}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Exportar em formato CSV / Planilha"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrint}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Imprimir escala"
              >
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}

          {isAdminOrLeader && (
            <>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Cadastrar todos os cultos do mês a partir de planilha ou CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Cultos (Planilha/CSV)</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                <span>{currentScale ? 'Regerar Escala' : 'Gerar Escala Automática'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Substitutions Notification Banner */}
      {substitutions.filter((s) => s.status === 'pendente').length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-950 dark:text-amber-100">
                {substitutions.filter((s) => s.status === 'pendente').length} Pedido(s) de Substituição Pendente(s) em {selectedMonth}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Integrantes da mesma função ministerial ou liderança foram notificados e podem assumir as escalas marcadas abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Publish Bar */}
      {isAdminOrLeader && currentScale && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
          <div>
            <span className="font-bold text-indigo-950 dark:text-indigo-200">
              Controle Editorial da Escala:
            </span>{' '}
            <span className="text-indigo-800 dark:text-indigo-300">
              {currentScale.status === 'publicada'
                ? 'Esta escala está publicada e visível para todos os 51 integrantes.'
                : 'Esta escala está em elaboração. Somente a liderança consegue visualizá-la.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentScale.status === 'em_elaboracao' ? (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{publishing ? 'Publicando...' : 'Publicar Escala Oficial'}</span>
              </button>
            ) : (
              <button
                onClick={handleUnpublish}
                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold text-xs transition cursor-pointer"
              >
                Voltar para Rascunho
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <Info className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Unallocated members warning info if generated */}
      {currentScale?.unallocatedMembers && currentScale.unallocatedMembers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Integrantes Disponíveis que Não Foram Escalados ({currentScale.unallocatedMembers.length})
            </span>
          </div>
          <p className="text-amber-800 dark:text-amber-300 mb-2 leading-relaxed">
            Pelas regras de justiça e disponibilidade de vagas, os seguintes integrantes informaram disponibilidade mas não puderam ser alocados. Conforme a regra do ministério, você pode ajustar manualmente:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {currentScale.unallocatedMembers.map((u) => (
              <div
                key={u.memberId}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 flex items-start justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{u.memberName}</span>
                  <RoleBadge role={u.role} size="sm" />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{u.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Scale Cultos Blocks */}
      {!currentScale ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-12 text-center border border-slate-200 dark:border-slate-800">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhuma escala gerada para {selectedMonth}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {isAdminOrLeader
              ? 'Clique no botão "Gerar Escala Automática" acima para que o sistema distribua os integrantes de forma equilibrada.'
              : 'A liderança do ministério ainda não gerou ou publicou a escala para este mês.'}
          </p>

          {isAdminOrLeader && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Gerar Escala Agora
            </button>
          )}
        </div>
      ) : monthCultos.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-8 text-center border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">Nenhum culto encontrado neste mês.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {monthCultos.map((culto) => {
            const parts = currentScale.participations.filter((p) => p.cultoId === culto.id);
            const filledCount = parts.filter((p) => p.memberId !== null).length;
            const openCount = parts.filter((p) => p.memberId === null).length;

            return (
              <div
                key={culto.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Culto Block Header */}
                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {culto.date.split('-')[2]}
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {culto.name}
                      </h2>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                        {formatDateBR(culto.date)} • às {culto.time}h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {filledCount} escalados
                    </span>
                    {openCount > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {openCount} vagas abertas
                      </span>
                    )}

                    {isAdminOrLeader && (
                      <button
                        onClick={() => handleOpenSlotEdit(culto.id, 'Ministro')}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        title="Adicionar vaga/integrante avulso"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Participations List */}
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {parts.map((p) => {
                      const isUnfilled = p.memberId === null;
                      const activeSub = substitutions.find(
                        (s) => s.participationId === p.id && s.status === 'pendente'
                      );
                      const isMySlot = session?.member?.id === p.memberId;
                      const isRequester = session?.member?.id === activeSub?.requestedByMemberId;
                      const userHasMatchingRole =
                        session?.member &&
                        (session.member.primaryRole === p.role ||
                          (session.member.secondaryRoles &&
                            session.member.secondaryRoles.includes(p.role)));
                      const canAcceptSub =
                        activeSub && (isAdminOrLeader || userHasMatchingRole) && !isRequester;
                      const canCancelSub = activeSub && (isRequester || isAdminOrLeader);

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                            activeSub
                              ? 'border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/30 ring-1 ring-amber-400/50'
                              : isUnfilled
                              ? 'border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <RoleBadge role={p.role} size="sm" />
                              <div className="min-w-0">
                                {isUnfilled ? (
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">
                                    Não preenchida
                                  </span>
                                ) : (
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                                    {p.memberName}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 block">
                                  {isUnfilled ? 'Vaga sem integrante disponível' : 'Confirmado'}
                                </span>
                              </div>
                            </div>

                            {/* Admin Edit Trigger */}
                            {isAdminOrLeader && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenSlotEdit(culto.id, p.role, p.id, p.memberId)
                                  }
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                  title={isUnfilled ? 'Preencher vaga' : 'Substituir integrante'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                  title="Remover vaga da escala"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Active Substitution Alert & Action Box */}
                          {activeSub && (
                            <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-100 space-y-1.5 animate-in fade-in">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-extrabold flex items-center gap-1 text-[11px] text-amber-900 dark:text-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Substituição Solicitada</span>
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200/90 dark:bg-amber-800 text-amber-900 dark:text-amber-200 font-bold uppercase">
                                  Aguardando
                                </span>
                              </div>

                              <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-tight">
                                Por: <strong>{activeSub.requestedByMemberName}</strong>
                                {activeSub.reason && (
                                  <span className="block italic text-[10px] text-amber-800 dark:text-amber-300 mt-0.5">
                                    "{activeSub.reason}"
                                  </span>
                                )}
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {canAcceptSub ? (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === activeSub.id}
                                    onClick={() => handleAcceptSubstitution(activeSub.id)}
                                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    {actionLoadingId === activeSub.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <HandHeart className="w-3 h-3" />
                                    )}
                                    <span>Assumir Escala</span>
                                  </button>
                                ) : !session ? (
                                  <button
                                    type="button"
                                    onClick={onOpenLogin}
                                    className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition text-center cursor-pointer"
                                  >
                                    Entrar para Assumir
                                  </button>
                                ) : null}

                                {canCancelSub && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === activeSub.id}
                                    onClick={() => handleCancelSubstitution(activeSub.id)}
                                    className="py-1 px-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[10px] transition cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Button to request substitution if slot is filled and no active substitution */}
                          {!isUnfilled && !activeSub && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!session) {
                                    onOpenLogin();
                                    return;
                                  }
                                  setActiveSubModal({
                                    participationId: p.id,
                                    cultoId: culto.id,
                                    cultoName: culto.name,
                                    cultoDate: culto.date,
                                    cultoTime: culto.time,
                                    role: p.role,
                                    currentMemberName: p.memberName || ''
                                  });
                                }}
                                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 transition cursor-pointer hover:underline"
                                title="Solicitar que outro integrante da mesma função assuma esta escala"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Solicitar Substituto</span>
                              </button>

                              {isMySlot && (
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  Sua vaga
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Slot Assignment / Replacement Modal */}
      {targetSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {targetSlot.currentMemberId ? 'Substituir Integrante' : 'Preencher Vaga'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={targetSlot.role} size="sm" />
                </div>
              </div>
              <button
                onClick={() => setTargetSlot(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Cancelar
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecione outro integrante disponível para assumir esta vaga no culto, ou deixe a vaga sem preenchimento:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-1">
              {/* Option to leave unfilled */}
              <button
                type="button"
                onClick={() => handleSelectCandidate(null)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition text-xs font-semibold text-amber-700 dark:text-amber-400 cursor-pointer"
              >
                <span>Deixar vaga em aberto (Não preenchida)</span>
                <UserX className="w-4 h-4" />
              </button>

              {candidateOptions.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => handleSelectCandidate(cand.id)}
                  className="w-full flex items-center justify-between p-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition">
                      {cand.name[0]}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {cand.name}
                      </span>
                      <RoleBadge role={cand.primaryRole} size="sm" />
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                </button>
              ))}

              {candidateOptions.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhum outro integrante cadastrado com esta função.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Cultos Modal */}
      <BatchImportCultosModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          if (onCultosUpdated) onCultosUpdated();
          onScaleUpdated();
        }}
        defaultMonth={selectedMonth}
      />

      {/* Request Substitution Modal */}
      {activeSubModal && (
        <RequestSubstitutionModal
          isOpen={!!activeSubModal}
          onClose={() => setActiveSubModal(null)}
          onSuccess={() => {
            setMessage({
              text: 'Pedido de substituição enviado com sucesso! Os integrantes da mesma função e a liderança foram notificados.',
              type: 'success'
            });
            loadSubstitutions();
          }}
          participationId={activeSubModal.participationId}
          cultoId={activeSubModal.cultoId}
          cultoName={activeSubModal.cultoName}
          cultoDate={activeSubModal.cultoDate}
          cultoTime={activeSubModal.cultoTime}
          role={activeSubModal.role}
          currentMemberName={activeSubModal.currentMemberName}
        />
      )}
    </div>
  );
};
