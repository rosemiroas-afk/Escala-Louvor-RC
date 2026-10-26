import React from 'react';
import { Calendar, Clock, CheckCircle2, Music, UserCheck, AlertCircle } from 'lucide-react';
import { Member, Culto, MonthlyScale } from '../types/index.ts';
import { RoleBadge } from '../components/RoleBadge.tsx';

interface MyParticipationsViewProps {
  member: Member;
  scales: MonthlyScale[];
  cultos: Culto[];
}

export const MyParticipationsView: React.FC<MyParticipationsViewProps> = ({
  member,
  scales,
  cultos
}) => {
  const publishedScales = scales.filter((s) => s.status === 'publicada');

  // Find all participations of this member in published scales
  const myParticipations: Array<{
    scaleMonth: string;
    culto: Culto;
    role: string;
  }> = [];

  for (const scale of publishedScales) {
    for (const p of scale.participations) {
      if (p.memberId === member.id) {
        const culto = cultos.find((c) => c.id === p.cultoId);
        if (culto) {
          myParticipations.push({
            scaleMonth: scale.month,
            culto,
            role: p.role
          });
        }
      }
    }
  }

  // Sort by culto date and time
  myParticipations.sort((a, b) => {
    const d = a.culto.date.localeCompare(b.culto.date);
    if (d !== 0) return d;
    return a.culto.time.localeCompare(b.culto.time);
  });

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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Meus Cultos Escalados
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {member.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sua agenda personalizada de ministração nas escalas oficiais publicadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RoleBadge role={member.primaryRole} size="lg" />
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
            {myParticipations.length}
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              Participações Confirmadas
            </span>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
              Escalas oficiais ativas publicadas pela liderança
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Função Principal
            </span>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {member.primaryRole || 'Não informada ainda'}
            </p>
          </div>
        </div>
      </div>

      {/* List of my scheduled services */}
      {myParticipations.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhuma participação agendada no momento
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Assim que a liderança publicar a escala oficial do mês com seu nome, seus cultos aparecerão aqui. Lembre-se de manter sua disponibilidade em dia!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myParticipations.map(({ culto, role }, idx) => (
            <div
              key={`${culto.id}_${idx}`}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center font-bold text-xs shrink-0">
                  <span className="text-[10px] uppercase">{culto.date.split('-')[2]}</span>
                  <Clock className="w-3.5 h-3.5 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {culto.name}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {formatDateBR(culto.date)} às {culto.time}h
                  </p>
                  {culto.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{culto.notes}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <RoleBadge role={role} size="md" />
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Escalado</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
