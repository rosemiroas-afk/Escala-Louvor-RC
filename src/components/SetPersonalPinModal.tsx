import React, { useState } from 'react';
import { Lock, KeyRound, Check, AlertCircle, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { Member } from '../types/index.ts';
import { api } from '../api.ts';

interface SetPersonalPinModalProps {
  isOpen: boolean;
  member: Member;
  onSuccess: (updatedMember: Member) => void;
  onSkip?: () => void;
}

export const SetPersonalPinModal: React.FC<SetPersonalPinModalProps> = ({
  isOpen,
  member,
  onSuccess,
  onSkip
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('O PIN deve conter pelo menos 4 dígitos.');
      return;
    }
    if (pin === '1234') {
      setError('Escolha um PIN diferente do padrão 1234 para sua segurança.');
      return;
    }
    if (pin !== confirmPin) {
      setError('A confirmação do PIN não coincide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.setPin(pin, member.id);
      const updated: Member = {
        ...member,
        pin,
        hasCustomPin: true,
        hasPin: true
      };
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar seu PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Primeiro Acesso Individual</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Cadastre seu PIN Pessoal
            </h2>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs leading-relaxed">
          Olá, <strong className="font-bold">{member.name}</strong>! Você acabou de acessar com a senha padrão (1234). Por segurança, crie agora o seu PIN pessoal para que apenas você consiga acessar e salvar sua disponibilidade.
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Novo PIN Pessoal (4 a 6 dígitos):
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 5821"
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-mono tracking-widest focus:ring-2 focus:ring-sky-500 outline-none"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirme o Novo PIN:
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Digite o mesmo PIN novamente"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-mono tracking-widest focus:ring-2 focus:ring-sky-500 outline-none"
              required
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando PIN...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Meu PIN e Continuar</span>
                </>
              )}
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Lembrar depois
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
