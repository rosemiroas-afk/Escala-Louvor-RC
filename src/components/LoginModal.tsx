import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  Check,
  AlertCircle,
  Search,
  Lock,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Users
} from 'lucide-react';
import { Member, MinisterialRole, ALL_ROLES, getMemberRoles } from '../types/index.ts';
import { api, UserSession } from '../api.ts';
import { RoleBadge } from './RoleBadge.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Array<Member & { hasPin?: boolean }>;
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  members,
  onLoginSuccess
}) => {
  const [tab, setTab] = useState<'integrante' | 'admin'>('integrante');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<(Member & { hasPin?: boolean; hasCustomPin?: boolean }) | null>(null);
  const [pin, setPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showSetPinPrompt, setShowSetPinPrompt] = useState(false);
  const [loggedInSession, setLoggedInSession] = useState<UserSession | null>(null);

  // Semper que abrir o modal, limpa a seleção anterior para permitir escolher qualquer um dos 51 integrantes
  useEffect(() => {
    if (isOpen) {
      setSelectedMember(null);
      setPin('');
      setAdminPin('');
      setError(null);
      setSearchTerm('');
      setShowSetPinPrompt(false);
      setNewPin('');
      setConfirmNewPin('');
      setLoggedInSession(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMemberSelect = (m: Member & { hasPin?: boolean; hasCustomPin?: boolean }) => {
    setSelectedMember(m);
    setPin('');
    setError(null);
  };

  const handleMemberLogin = async () => {
    if (!selectedMember) return;
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError('Digite seu código PIN para entrar (padrão inicial: 1234).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.loginMember(selectedMember.id, cleanPin);
      const session: UserSession = {
        userType: 'integrante',
        roleLevel: res.roleLevel,
        member: res.member,
        token: res.token
      };

      if (res.needsPinSetup || cleanPin === '1234') {
        setLoggedInSession(session);
        setShowSetPinPrompt(true);
      } else {
        onLoginSuccess(session);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async (skip = false) => {
    if (!loggedInSession || !loggedInSession.member) return;
    if (skip) {
      onLoginSuccess(loggedInSession);
      onClose();
      return;
    }

    if (!newPin || newPin.length < 4) {
      setError('O PIN deve conter ao menos 4 dígitos numéricos.');
      return;
    }

    if (newPin === '1234') {
      setError('Escolha um PIN diferente do padrão 1234 para sua proteção.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('A confirmação do PIN não coincide com o novo PIN.');
      return;
    }

    try {
      setLoading(true);
      await api.setPin(newPin, loggedInSession.member.id);
      const updatedMember: Member = {
        ...loggedInSession.member,
        pin: newPin,
        hasCustomPin: true,
        hasPin: true
      };
      onLoginSuccess({
        ...loggedInSession,
        member: updatedMember
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.loginAdmin(adminPin);
      const session: UserSession = {
        userType: 'admin',
        roleLevel: 'admin',
        token: res.token
      };
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || 'PIN administrativo incorreto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <img
              src="./logo-igreja.png"
              alt="Logo Igreja Rasgando os Céus Bauru"
              className="w-11 h-11 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = './logo-igreja.jpg';
              }}
            />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Igreja Rasgando os Céus — Bauru
              </h2>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold">
                Painel de Escala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* First time PIN prompt */}
        {showSetPinPrompt && loggedInSession?.member ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-sm">
              <Lock className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Primeiro Acesso: Crie seu PIN Pessoal</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Olá, <strong>{loggedInSession.member.name}</strong>! Você acessou com a senha padrão 1234. Defina agora seu PIN individual (4 a 6 dígitos) para proteger suas funções e disponibilidade.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Novo PIN Pessoal (4 a 6 dígitos):
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 5821"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirme o Novo PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Repita o novo PIN"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSetNewPin(true)}
                className="flex-1 py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Definir depois
              </button>
              <button
                type="button"
                onClick={() => handleSetNewPin(false)}
                disabled={loading || newPin.length < 4}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Salvar Meu PIN'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <button
                onClick={() => {
                  setTab('integrante');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
                  tab === 'integrante'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Integrante (51 Nomes)</span>
              </button>
              <button
                onClick={() => {
                  setTab('admin');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
                  tab === 'admin'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Liderança / Admin</span>
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {tab === 'integrante' ? (
                <div className="space-y-4">
                  {!selectedMember ? (
                    <div>
                      <div className="relative mb-3">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar seu nome (ex: ADNELSON, MIRO...)"
                          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMemberSelect(m)}
                            className="w-full flex items-center justify-between p-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition group cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                                {m.name[0]}
                              </span>
                              <div>
                                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {m.name}
                                </span>
                                {m.primaryRole && (
                                  <div className="text-[11px] text-slate-400">
                                    {m.primaryRole}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {m.hasPin && (
                                <span title="Protegido por PIN">
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1 justify-end max-w-[140px]">
                                {getMemberRoles(m).map((role) => (
                                  <RoleBadge key={role} role={role} size="sm" />
                                ))}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
                            </div>
                          </button>
                        ))}

                        {filteredMembers.length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-400">
                            Nenhum integrante encontrado com "{searchTerm}".
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Botão de Voltar para a lista dos 51 integrantes */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null);
                          setPin('');
                          setError(null);
                        }}
                        className="w-full py-2 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>← Escolher Outro Integrante (Ver 51 Nomes)</span>
                      </button>

                      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                            {selectedMember.name[0]}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {selectedMember.name}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {getMemberRoles(selectedMember).length > 0 ? (
                                getMemberRoles(selectedMember).map((role) => (
                                  <RoleBadge key={role} role={role} size="sm" />
                                ))
                              ) : (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">Sem função definida</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(null);
                            setPin('');
                            setError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs"
                        >
                          Trocar Nome
                        </button>
                      </div>

                      {/* PIN Input field directly below member name */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {selectedMember.hasCustomPin || selectedMember.hasPin
                            ? 'Digite seu PIN pessoal individual:'
                            : 'Código PIN de Acesso (padrão inicial: 1234):'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder={
                              selectedMember.hasCustomPin || selectedMember.hasPin
                                ? 'PIN pessoal (4 a 6 dígitos)'
                                : 'Digite 1234'
                            }
                            className="w-full px-4 py-3 text-center text-xl tracking-widest font-mono rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleMemberLogin();
                              }
                            }}
                          />
                        </div>

                        {selectedMember.hasCustomPin || selectedMember.hasPin ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Digite sua senha individual. Se você esqueceu, solicite ao líder/administrador para resetar para o padrão 1234.
                          </p>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <KeyRound className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                              Primeiro acesso de <strong>{selectedMember.name}</strong>: digite a senha padrão <strong>1234</strong>. Em seguida você definirá seu PIN individual definitivo.
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleMemberLogin}
                        disabled={loading || !pin.trim()}
                        className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? 'Entrando...' : 'Confirmar e Entrar'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1">Área da Liderança & Administração</p>
                    <p>
                      Permite cadastrar cultos, gerar a escala automática, fazer ajustes manuais, publicar escalas e gerenciar os 51 integrantes.
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-amber-700 dark:text-amber-400">
                      PIN padrão inicial: <strong>1234</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      PIN de Administrador:
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        placeholder="Ex: 1234"
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !adminPin}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{loading ? 'Verificando...' : 'Entrar como Administrador'}</span>
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
