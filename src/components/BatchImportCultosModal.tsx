import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  X,
  FileText,
  HelpCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Culto, CultoStatus } from '../types/index.ts';
import { api } from '../api.ts';

interface BatchImportCultosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMonth?: string;
}

interface ParsedCultoRow {
  id: string;
  dayOfMonth: string;
  dayOfWeek: string;
  name: string;
  time: string;
  calculatedDate: string; // YYYY-MM-DD
  valid: boolean;
  error?: string;
}

export const BatchImportCultosModal: React.FC<BatchImportCultosModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMonth
}) => {
  const now = new Date();
  const currentYearMonth = defaultMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedCultoRow[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Normalize time string: 19:30, 19h, 19h30, 9:30 -> HH:MM
  const normalizeTime = (raw: string): string => {
    let t = raw.trim().toLowerCase().replace('h', ':');
    if (!t.includes(':')) {
      t = `${t}:00`;
    }
    const parts = t.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
    return `${hours}:${minutes}`;
  };

  // Parse lines of CSV / TSV / text
  const parseContent = (content: string, monthYear: string) => {
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows: ParsedCultoRow[] = [];

    lines.forEach((line, index) => {
      // Determine separator: tab, semicolon or comma
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else if (line.includes(';')) {
        cols = line.split(';').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Comma separated
        cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }

      // Skip common header row
      const firstColLower = (cols[0] || '').toLowerCase();
      if (
        index === 0 &&
        (firstColLower.includes('dia') ||
          firstColLower.includes('data') ||
          firstColLower.includes('day'))
      ) {
        return;
      }

      if (cols.length < 3) {
        return; // Skip empty / invalid line
      }

      const rawDay = cols[0] || '';
      const dayOfWeek = cols[1] || '';
      const name = cols[2] || '';
      const rawTime = cols[3] || '19:00';

      // Clean day number
      let dayNumber = 1;
      let calculatedDate = '';
      let isValid = true;
      let errorDesc: string | undefined;

      // Extract number from day (e.g. "01", "1", "01/11/2026", "2026-11-01")
      if (rawDay.includes('/')) {
        const parts = rawDay.split('/');
        dayNumber = parseInt(parts[0]);
      } else if (rawDay.includes('-')) {
        const parts = rawDay.split('-');
        dayNumber = parseInt(parts[parts.length - 1]);
      } else {
        const match = rawDay.match(/\d+/);
        dayNumber = match ? parseInt(match[0]) : 1;
      }

      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
        isValid = false;
        errorDesc = 'Dia do mês inválido';
      }

      const formattedDay = String(dayNumber).padStart(2, '0');
      calculatedDate = `${yearStr}-${monthStr}-${formattedDay}`;

      // Test valid date in JS
      const d = new Date(year, month - 1, dayNumber);
      if (d.getMonth() !== month - 1) {
        isValid = false;
        errorDesc = `Dia ${dayNumber} não existe neste mês`;
      }

      let time = '19:00';
      try {
        time = normalizeTime(rawTime);
      } catch {
        isValid = false;
        errorDesc = 'Horário em formato incorreto';
      }

      if (!name.trim()) {
        isValid = false;
        errorDesc = 'Nome do culto não preenchido';
      }

      rows.push({
        id: `row_${index}_${Math.random().toString(36).substring(2, 6)}`,
        dayOfMonth: String(dayNumber),
        dayOfWeek: dayOfWeek || 'Culto',
        name: name.trim(),
        time,
        calculatedDate,
        valid: isValid,
        error: errorDesc
      });
    });

    setParsedRows(rows);
    if (rows.length === 0) {
      setErrorMessage('Nenhum culto reconhecido no arquivo ou texto colado.');
    } else {
      setErrorMessage(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseContent(text, selectedMonth);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole os dados da planilha antes de processar.');
      return;
    }
    parseContent(pastedText, selectedMonth);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Dia do Mes,Dia da Semana,Nome do Culto,Horario\n' +
      '01,Domingo,Culto de Ceia e Comunhão,19:00\n' +
      '04,Quarta-feira,Culto de Doutrina e Oração,19:30\n' +
      '07,Sábado,Culto de Jovens e Adolescentes,19:30\n' +
      '08,Domingo,Culto Matutino,09:30\n' +
      '08,Domingo,Culto da Família,19:00\n' +
      '11,Quarta-feira,Culto de Ensino,19:30\n' +
      '15,Domingo,Culto de Missões,19:00\n' +
      '18,Quarta-feira,Culto de Avivamento,19:30\n' +
      '22,Domingo,Culto de Louvor e Adoração,19:00\n' +
      '25,Quarta-feira,Culto da Vitória,19:30\n' +
      '29,Domingo,Culto de Ação de Graças,19:00';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modelo_cultos_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      setErrorMessage('Nenhum culto válido para cadastrar.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const cultosToCreate: Array<Omit<Culto, 'id' | 'createdAt'>> = validRows.map((r) => ({
      name: r.name,
      date: r.calculatedDate,
      time: r.time,
      status: 'aberto',
      notes: `Importado em lote (${r.dayOfWeek})`
    }));

    try {
      await api.batchImportCultos(
        cultosToCreate,
        replaceExisting ? selectedMonth : undefined
      );

      setSuccessMessage(`${cultosToCreate.length} cultos cadastrados com sucesso para ${selectedMonth}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao importar cultos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Importação em Lote de Cultos
              </h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                Cadastrar todos os cultos do mês a partir de CSV ou Planilha
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Month selector & Template download */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Mês de Destino:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  if (parsedRows.length > 0) {
                    // Re-parse with new month
                    if (activeTab === 'paste' && pastedText) {
                      parseContent(pastedText, e.target.value);
                    }
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha Modelo (.csv)</span>
            </button>
          </div>

          {/* Format Specification Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Estrutura esperada do arquivo ou planilha (4 colunas):</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono mt-1 text-amber-800 dark:text-amber-300">
                  <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-300/60">
                    <strong>1ª Coluna:</strong> Dia (ex: 01, 15)
                  </div>
                  <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-300/60">
                    <strong>2ª Coluna:</strong> Dia da Semana (ex: Domingo)
                  </div>
                  <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-300/60">
                    <strong>3ª Coluna:</strong> Nome do Culto
                  </div>
                  <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-300/60">
                    <strong>4ª Coluna:</strong> Horário (ex: 19:00)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Subir Arquivo (.CSV ou Planilha)</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Colar Linhas do Excel / Google Sheets</span>
            </button>
          </div>

          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-3xl text-center bg-indigo-50/20 dark:bg-indigo-950/20 hover:bg-indigo-50/50 transition cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Clique aqui para selecionar seu arquivo CSV
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Suporta arquivos exportados do Excel, Google Planilhas ou texto separado por vírgula/ponto-e-vírgula
              </p>
            </div>
          )}

          {/* Tab 2: Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Copie as linhas da sua planilha e cole aqui...&#10;Exemplo:&#10;01	Domingo	Culto de Ceia	19:00&#10;04	Quarta	Culto de Ensino	19:30"
                className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleProcessPasted}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Processar Texto Colado
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    Pré-visualização dos Cultos Identificados ({parsedRows.length})
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {parsedRows.filter((r) => r.valid).length} válidos
                  </span>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Substituir cultos já existentes deste mês</span>
                </label>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Dia</th>
                      <th className="py-2.5 px-3">Dia da Semana</th>
                      <th className="py-2.5 px-3">Nome do Culto</th>
                      <th className="py-2.5 px-3">Horário</th>
                      <th className="py-2.5 px-3">Data Final</th>
                      <th className="py-2.5 px-2 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.valid
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'bg-red-50/50 dark:bg-red-950/20'
                        }
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {row.dayOfMonth}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {row.dayOfWeek}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {row.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {row.time}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {row.calculatedDate}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={loading || parsedRows.filter((r) => r.valid).length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importando Cultos...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirmar e Cadastrar {parsedRows.filter((r) => r.valid).length} Cultos
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
