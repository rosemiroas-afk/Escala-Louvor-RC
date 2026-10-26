import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ChevronRight
} from 'lucide-react';
import { Culto, CultoStatus } from '../types/index.ts';
import { api } from '../api.ts';

interface CultosViewProps {
  cultos: Culto[];
  onCultosUpdated: () => void;
}

export const CultosView: React.FC<CultosViewProps> = ({ cultos, onCultosUpdated }) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCulto, setEditingCulto] = useState<Culto | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CultoStatus>('aberto');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter cultos by month and sort chronologically
  const monthCultos = cultos
    .filter((c) => c.date.startsWith(selectedMonth))
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.time.localeCompare(b.time);
    });

  const handleOpenCreate = () => {
    setEditingCulto(null);
    setName('');
    setDate(`${selectedMonth}-01`);
    setTime('19:00');
    setNotes('');
    setStatus('aberto');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (culto: Culto) => {
    setEditingCulto(culto);
    setName(culto.name);
    setDate(culto.date);
    setTime(culto.time);
    setNotes(culto.notes || '');
    setStatus(culto.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !time) {
      setError('Por favor preencha nome, data e horário.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingCulto) {
        await api.updateCulto(editingCulto.id, {
          name,
          date,
          time,
          notes,
          status
        });
      } else {
        await api.createCulto({
          name,
          date,
          time,
          notes,
          status
        });
      }
      setIsModalOpen(false);
      onCultosUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar culto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o culto "${name}"?`)) return;
    try {
      await api.deleteCulto(id);
      onCultosUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir culto.');
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Cadastro Dinâmico de Cultos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre múltiplos cultos por semana, domingos, dias úteis e vigílias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month filter */}
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
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Culto</span>
          </button>
        </div>
      </div>

      {/* List */}
      {monthCultos.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-12 text-center border border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhum culto para o mês {selectedMonth}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Cadastre os cultos deste período para que os 51 integrantes possam preencher a disponibilidade mensal.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
          >
            Cadastrar Primeiro Culto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {monthCultos.map((culto) => (
            <div
              key={culto.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex flex-col items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] uppercase">{culto.date.split('-')[2]}</span>
                  <Clock className="w-3.5 h-3.5 mt-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {culto.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        culto.status === 'aberto'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : culto.status === 'realizado'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {culto.status === 'aberto'
                        ? 'Aberto para Disponibilidade'
                        : culto.status === 'realizado'
                        ? 'Realizado'
                        : culto.status}
                    </span>
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

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleOpenEdit(culto)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Editar culto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(culto.id, culto.name)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                  title="Excluir culto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingCulto ? 'Editar Culto' : 'Novo Culto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome / Descrição do Culto:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Culto de Celebração (Manhã), Culto da Família..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário de Início:
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Situação:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CultoStatus)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="aberto">Aberto para Disponibilidade</option>
                  <option value="em_elaboracao">Em Elaboração</option>
                  <option value="publicado">Publicado</option>
                  <option value="realizado">Realizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Culto de Santa Ceia, Banda Jovem, etc."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Gravando...' : 'Salvar Culto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
