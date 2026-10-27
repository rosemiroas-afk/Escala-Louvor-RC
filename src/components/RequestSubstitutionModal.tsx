import React, { useState } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Clock,
  Calendar,
  X,
  Share2,
  Copy,
  Check,
  Send,
  Loader2,
  BellRing,
  ShieldAlert
} from 'lucide-react';
import { MinisterialRole } from '../types/index.ts';
import { api } from '../api.ts';
import { RoleBadge } from './RoleBadge.tsx';

interface RequestSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  participationId: string;
  cultoId: string;
  cultoName: string;
  cultoDate: string;
  cultoTime: string;
  role: MinisterialRole;
  currentMemberName: string;
}

export const RequestSubstitutionModal: React.FC<RequestSubstitutionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  participationId,
  cultoId,
  cultoName,
  cultoDate,
  cultoTime,
  role,
  currentMemberName
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formatDateBR = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const whatsappMessage =
    `🚨 *PEDIDO DE SUBSTITUIÇÃO - MINISTÉRIO DE LOUVOR* 🚨\n\n` +
    `*Igreja Rasgando os Céus — Bauru*\n` +
    `*Culto:* ${cultoName}\n` +
    `*Data:* ${formatDateBR(cultoDate)} às ${cultoTime}h\n` +
    `*Função:* ${role}\n` +
    `*Integrante que precisa de substituto:* ${currentMemberName}\n` +
    (reason ? `*Motivo:* ${reason}\n\n` : '\n') +
    `_Quem da função puder assumir esta escala, por favor entre no aplicativo do Louvor ou avise aqui no grupo!_`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.requestSubstitution(participationId, cultoId, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar solicitação de substituição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Solicitar Substituto
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                Notificação automática para os integrantes da função e liderança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Culto:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{cultoName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Data e Horário:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDateBR(cultoDate)} • às {cultoTime}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Função:</span>
              <RoleBadge role={role} size="sm" />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Integrante Escalado:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentMemberName}</span>
            </div>
          </div>

          {/* Automatic notification notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
              <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Notificação Automática do Sistema:</span>
            </div>
            <ul className="text-[11px] space-y-1 text-indigo-800 dark:text-indigo-300 list-disc list-inside">
              <li>
                Todos os integrantes com a função <strong>{role}</strong> serão avisados no painel.
              </li>
              <li>
                A liderança e administração do ministério receberão o alerta de substituição.
              </li>
              <li>
                Qualquer <strong>{role}</strong> disponível poderá assumir a vaga com 1 clique no app.
              </li>
            </ul>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Motivo ou Observação da Ausência:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Viagem de trabalho, compromisso familiar, motivo de saúde..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {/* Quick reason presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Viagem', 'Trabalho', 'Motivo de Saúde', 'Imprevisto Familiar'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2 py-0.5 text-[10px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp share helper */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition border border-emerald-300 dark:border-emerald-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Mensagem Copiada!' : 'Copiar Texto para WhatsApp'}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Pedido...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirmar e Notificar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
