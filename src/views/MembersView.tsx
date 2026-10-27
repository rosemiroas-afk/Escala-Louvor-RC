import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Phone,
  Lock,
  AlertCircle,
  X,
  Save,
  Check,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { Member, MinisterialRole, UserRoleLevel, ALL_ROLES, getMemberRoles } from '../types/index.ts';
import { RoleBadge, MemberRolesBadges } from '../components/RoleBadge.tsx';
import { api } from '../api.ts';

interface MembersViewProps {
  members: Array<Member & { hasPin?: boolean }>;
  onMembersUpdated: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({ members, onMembersUpdated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<(Member & { hasPin?: boolean }) | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<MinisterialRole[]>([]);
  const [contact, setContact] = useState('');
  const [roleLevel, setRoleLevel] = useState<UserRoleLevel>('integrante');
  const [active, setActive] = useState(true);
  const [resetPin, setResetPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const mRoles = getMemberRoles(m);
    const matchesRole =
      roleFilter === 'todos'
        ? true
        : roleFilter === 'sem_funcao'
        ? mRoles.length === 0
        : mRoles.includes(roleFilter as MinisterialRole);

    const matchesStatus =
      statusFilter === 'todos'
        ? true
        : statusFilter === 'ativos'
        ? m.active
        : !m.active;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingMember(null);
    setName('');
    setSelectedRoles([]);
    setContact('');
    setRoleLevel('integrante');
    setActive(true);
    setResetPin(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Member & { hasPin?: boolean }) => {
    setEditingMember(m);
    setName(m.name);
    setSelectedRoles(getMemberRoles(m));
    setContact(m.contact || '');
    setRoleLevel(m.roleLevel);
    setActive(m.active);
    setResetPin(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleFormRole = (r: MinisterialRole) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((role) => role !== r) : [...prev, r]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do integrante é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingMember) {
        await api.updateMemberAdmin(editingMember.id, {
          name,
          roles: selectedRoles,
          primaryRole: selectedRoles[0] || null,
          contact,
          roleLevel,
          active,
          resetPin
        });
      } else {
        await api.createMember({
          name,
          roles: selectedRoles,
          primaryRole: selectedRoles[0] || undefined,
          contact,
          roleLevel
        });
      }

      setIsModalOpen(false);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar integrante.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: Member & { hasPin?: boolean }) => {
    const nextState = !m.active;
    const actionText = nextState ? 'reativar' : 'desativar';
    if (!window.confirm(`Deseja realmente ${actionText} o cadastro de ${m.name}?`)) return;

    try {
      await api.updateMemberAdmin(m.id, { active: nextState });
      onMembersUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar situação.');
    }
  };

  const handleResetPin = async (m: Member & { hasPin?: boolean }) => {
    if (!window.confirm(`Deseja resetar o PIN de ${m.name} para a senha padrão 1234?`)) return;
    try {
      const res = await api.resetMemberPin(m.id);
      alert(res.message || `PIN de ${m.name} resetado para o padrão 1234 com sucesso!`);
      onMembersUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao resetar PIN.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Integrantes do Louvor
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {members.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão completa dos 51 integrantes, funções selecionadas, contatos e PINs de acesso.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Integrante</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome (ex: ADNELSON, ANA...)"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="todos">Todas as Funções</option>
            <option value="sem_funcao">Sem Função Selecionada</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMembers.map((m) => {
          const mRoles = getMemberRoles(m);
          return (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 ${
                !m.active
                  ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200 shrink-0">
                    {m.name[0]}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {m.name}
                      </h3>
                      {m.roleLevel === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <MemberRolesBadges roles={mRoles} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {m.hasPin ? (
                    <span title="PIN cadastrado">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  ) : (
                    <span title="Sem PIN individual">
                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                    </span>
                  )}
                </div>
              </div>

              {m.contact && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{m.contact}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleActive(m)}
                  className={`text-[11px] font-semibold cursor-pointer ${
                    m.active
                      ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {m.active ? '● Ativo' : '○ Inativo'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleResetPin(m)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded-lg transition cursor-pointer"
                    title="Resetar PIN deste integrante para o padrão inicial 1234"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resetar PIN (1234)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(m)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    title="Editar cadastro"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          Nenhum integrante encontrado com os filtros selecionados.
        </div>
      )}

      {/* Modal Edit / Create Member */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingMember ? `Editar ${editingMember.name}` : 'Cadastrar Integrante'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
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

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Integrante (Letras maiúsculas):
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Ex: ADNELSON, ALEXANDRE..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold"
                  required
                />
              </div>

              {/* Multi-role selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Funções Ministeriais ({selectedRoles.length} selecionada{selectedRoles.length === 1 ? '' : 's'}):
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selecione quantas quiser
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const isSelected = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleToggleFormRole(r)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <span className="truncate">{r}</span>
                        <span
                          className={`w-4 h-4 rounded text-[10px] flex items-center justify-center shrink-0 ml-1.5 ${
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
                {selectedRoles.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                    Nenhuma função atribuída. O integrante poderá escolher suas próprias funções pelo celular.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="(14) 99999-9999"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Perfil de Acesso:
                  </label>
                  <select
                    value={roleLevel}
                    onChange={(e) => setRoleLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="integrante">Integrante Comum</option>
                    <option value="lider">Líder do Ministério</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Cadastro ativo no Ministério de Louvor</span>
                </label>

                {editingMember && editingMember.hasPin && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={resetPin}
                      onChange={(e) => setResetPin(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Redefinir PIN de acesso (se o integrante esqueceu)</span>
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
