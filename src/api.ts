import {
  Member,
  Culto,
  Availability,
  MonthlyScale,
  ScaleParticipation,
  MinisterialRole,
  UserRoleLevel,
  SubstitutionRequest
} from './types/index.ts';
import { localDb } from './localDb.ts';

const TOKEN_KEY = 'louvor_auth_token';
const USER_KEY = 'louvor_user_info';

export interface UserSession {
  userType: 'admin' | 'integrante';
  roleLevel: UserRoleLevel;
  member?: Member;
  token: string;
}

export function getStoredSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (raw && token) {
      const parsed = JSON.parse(raw);
      return { ...parsed, token };
    }
  } catch {
    // fallback
  }
  return null;
}

export function setStoredSession(session: UserSession | null) {
  if (!session) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        userType: session.userType,
        roleLevel: session.roleLevel,
        member: session.member
      })
    );
  }
}

// Track whether backend is reachable
let isOfflineOrStatic = false;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isOfflineOrStatic) {
    throw new Error('STATIC_MODE');
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    // If 404 on API endpoint, we are on GitHub Pages / static host without backend!
    if (response.status === 404 || !response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) {
        isOfflineOrStatic = true;
        throw new Error('STATIC_MODE');
      }
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    if (err.message === 'STATIC_MODE' || err.name === 'TypeError') {
      isOfflineOrStatic = true;
      throw new Error('STATIC_MODE');
    }
    throw err;
  }
}

export const api = {
  isStaticMode() {
    return isOfflineOrStatic;
  },

  // Bootstrap
  async getBootstrap() {
    try {
      return await request<{
        membersCount: number;
        activeMembersCount: number;
        cultos: Culto[];
        scales: MonthlyScale[];
        roleQuotas: Record<MinisterialRole, number>;
        currentUser: {
          userType: 'admin' | 'integrante';
          roleLevel: UserRoleLevel;
          member: Member | null;
        } | null;
      }>('/api/bootstrap');
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const session = getStoredSession();
        return localDb.getBootstrap(session?.member?.id);
      }
      throw e;
    }
  },

  // Auth
  async loginAdmin(pin: string) {
    try {
      const res = await request<{
        success: boolean;
        token: string;
        userType: 'admin';
        roleLevel: 'admin';
      }>('/api/auth/login-admin', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });
      setStoredSession({
        userType: 'admin',
        roleLevel: 'admin',
        token: res.token
      });
      return res;
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const res = localDb.loginAdmin(pin);
        setStoredSession({
          userType: 'admin',
          roleLevel: 'admin',
          token: res.token
        });
        return res;
      }
      throw e;
    }
  },

  async loginMember(memberId: string, pin?: string) {
    try {
      const res = await request<{
        success: boolean;
        token: string;
        userType: 'integrante';
        roleLevel: UserRoleLevel;
        member: Member;
        hasPinSet: boolean;
        hasCustomPin?: boolean;
        needsPinSetup?: boolean;
      }>('/api/auth/login-member', {
        method: 'POST',
        body: JSON.stringify({ memberId, pin })
      });
      setStoredSession({
        userType: 'integrante',
        roleLevel: res.roleLevel,
        member: res.member,
        token: res.token
      });
      return res;
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const res = localDb.loginMember(memberId, pin);
        setStoredSession({
          userType: 'integrante',
          roleLevel: res.roleLevel,
          member: res.member,
          token: res.token
        });
        return res;
      }
      throw e;
    }
  },

  async setPin(pin: string, memberId?: string) {
    try {
      return await request<{ success: boolean; message: string; member?: Member }>('/api/auth/set-pin', {
        method: 'POST',
        body: JSON.stringify({ pin, memberId })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.setPin(pin, memberId);
      }
      throw e;
    }
  },

  async resetMemberPin(memberId: string) {
    try {
      return await request<{ success: boolean; message: string; member?: Member }>(`/api/members/${memberId}/reset-pin`, {
        method: 'POST'
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.resetMemberPin(memberId);
      }
      throw e;
    }
  },

  logout() {
    setStoredSession(null);
  },

  // Members
  async getMembers() {
    try {
      return await request<Array<Member & { hasPin: boolean }>>('/api/members');
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const db = localDb.get();
        return db.members.map(({ pin, ...rest }) => ({
          ...rest,
          hasPin: Boolean(pin && pin.trim() !== '')
        }));
      }
      throw e;
    }
  },

  async updateMemberRole(
    memberId: string,
    rolesOrPrimary: MinisterialRole[] | MinisterialRole | null,
    contact?: string
  ) {
    const roles = Array.isArray(rolesOrPrimary)
      ? rolesOrPrimary
      : rolesOrPrimary
      ? [rolesOrPrimary]
      : [];
    try {
      return await request<{ success: boolean; member: Member }>(`/api/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ roles, primaryRole: roles[0] || null, contact })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.updateMemberRole(memberId, roles, contact);
      }
      throw e;
    }
  },

  async updateMemberAdmin(memberId: string, data: Partial<Member> & { resetPin?: boolean }) {
    try {
      return await request<{ success: boolean; member: Member }>(`/api/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.updateMemberAdmin(memberId, data);
      }
      throw e;
    }
  },

  async createMember(data: {
    name: string;
    roles?: MinisterialRole[];
    primaryRole?: MinisterialRole;
    contact?: string;
    roleLevel?: UserRoleLevel;
  }) {
    try {
      return await request<{ success: boolean; member: Member }>('/api/members', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.createMember(data);
      }
      throw e;
    }
  },

  // Cultos
  async getCultos(month?: string) {
    try {
      const q = month ? `?month=${month}` : '';
      return await request<Culto[]>(`/api/cultos${q}`);
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.getCultos(month);
      }
      throw e;
    }
  },

  async createCulto(data: Omit<Culto, 'id' | 'createdAt'>) {
    try {
      return await request<{ success: boolean; culto: Culto }>('/api/cultos', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.createCulto(data);
      }
      throw e;
    }
  },

  async updateCulto(id: string, data: Partial<Culto>) {
    try {
      return await request<{ success: boolean; culto: Culto }>(`/api/cultos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.updateCulto(id, data);
      }
      throw e;
    }
  },

  async deleteCulto(id: string) {
    try {
      return await request<{ success: boolean; message: string }>(`/api/cultos/${id}`, {
        method: 'DELETE'
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.deleteCulto(id);
      }
      throw e;
    }
  },

  async batchImportCultos(
    cultos: Array<Omit<Culto, 'id' | 'createdAt'>>,
    replaceExistingForMonth?: string
  ) {
    try {
      return await request<{ success: boolean; count: number; cultos: Culto[] }>('/api/cultos/batch-import', {
        method: 'POST',
        body: JSON.stringify({ cultos, replaceExistingForMonth })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.batchImportCultos(cultos, replaceExistingForMonth);
      }
      throw e;
    }
  },

  // Availabilities
  async getAvailabilities(month?: string, memberId?: string) {
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (memberId) params.set('memberId', memberId);
      return await request<Availability[]>(`/api/availabilities?${params.toString()}`);
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const db = localDb.get();
        let list = db.availabilities;
        if (memberId) list = list.filter((a) => a.memberId === memberId);
        if (month) {
          const cultoIdsInMonth = new Set(
            db.cultos.filter((c) => c.date.startsWith(month)).map((c) => c.id)
          );
          list = list.filter((a) => cultoIdsInMonth.has(a.cultoId));
        }
        return list;
      }
      throw e;
    }
  },

  async saveAvailabilities(
    memberId: string,
    items: Array<{ cultoId: string; status: 'disponivel' | 'indisponivel' }>
  ) {
    try {
      return await request<{ success: boolean; message: string }>('/api/availabilities', {
        method: 'POST',
        body: JSON.stringify({ memberId, items })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.saveAvailabilities(memberId, items);
      }
      throw e;
    }
  },

  // Scales
  async getScales(month?: string) {
    try {
      const q = month ? `?month=${month}` : '';
      return await request<MonthlyScale[]>(`/api/scales${q}`);
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const db = localDb.get();
        let list = db.scales;
        if (month) list = list.filter((s) => s.month === month);
        return list;
      }
      throw e;
    }
  },

  async generateScale(month: string) {
    try {
      return await request<{ success: boolean; scale: MonthlyScale }>('/api/scales/generate', {
        method: 'POST',
        body: JSON.stringify({ month })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.generateScale(month);
      }
      throw e;
    }
  },

  async updateScaleParticipations(id: string, participations: ScaleParticipation[], notes?: string) {
    try {
      return await request<{ success: boolean; scale: MonthlyScale }>(`/api/scales/${id}/participations`, {
        method: 'PUT',
        body: JSON.stringify({ participations, notes })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.updateScaleParticipations(id, participations, notes);
      }
      throw e;
    }
  },

  async publishScale(id: string) {
    try {
      return await request<{ success: boolean; scale: MonthlyScale; message: string }>(
        `/api/scales/${id}/publish`,
        { method: 'POST' }
      );
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.publishScale(id);
      }
      throw e;
    }
  },

  async unpublishScale(id: string) {
    try {
      return await request<{ success: boolean; scale: MonthlyScale; message: string }>(
        `/api/scales/${id}/unpublish`,
        { method: 'POST' }
      );
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.unpublishScale(id);
      }
      throw e;
    }
  },

  // Dashboard Stats
  async getDashboardStats(month: string) {
    try {
      return await request<{
        month: string;
        totalActiveMembers: number;
        totalCultosInMonth: number;
        membersRespondedCount: number;
        membersNotRespondedCount: number;
        scaleStatus: string;
        scaleGeneratedAt: string | null;
        scalePublishedAt: string | null;
        filledVacancies: number;
        unfilledVacancies: number;
        unallocatedMembers: MonthlyScale['unallocatedMembers'];
        memberStats: Array<{
          id: string;
          name: string;
          role: string;
          active: boolean;
          hasResponded: boolean;
          availableCount: number;
          unavailableCount: number;
          scheduledCount: number;
          timesAvailableNotScheduled: number;
        }>;
      }>(`/api/dashboard/stats?month=${month}`);
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.getDashboardStats(month);
      }
      throw e;
    }
  },

  // Config & Admin Actions
  async updateQuotas(quotas: Record<MinisterialRole, number>, adminPin?: string) {
    try {
      return await request<{ success: boolean; quotas: Record<MinisterialRole, number>; message: string }>(
        '/api/config/quotas',
        {
          method: 'PUT',
          body: JSON.stringify({ quotas, adminPin })
        }
      );
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const db = localDb.get();
        db.roleQuotas = { ...db.roleQuotas, ...quotas };
        if (adminPin && adminPin.trim().length >= 4) {
          db.adminPin = adminPin.trim();
        }
        localDb.save();
        return { success: true, quotas: db.roleQuotas, message: 'Configurações atualizadas no navegador!' };
      }
      throw e;
    }
  },

  async triggerDemoAction(action: 'assign_roles' | 'simulate_availability' | 'reset_all', month?: string) {
    try {
      return await request<{ success: boolean; message: string }>('/api/admin/demo-seed', {
        method: 'POST',
        body: JSON.stringify({ action, month })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const db = localDb.get();
        if (action === 'assign_roles') {
          const rolesCycle: MinisterialRole[] = [
            'Ministro', 'Ministro', 'Ministro',
            'Guitarrista', 'Guitarrista',
            'Tecladista', 'Tecladista',
            'Violonista', 'Violonista',
            'Baterista', 'Baterista',
            'Baixista', 'Baixista',
            'Contralto', 'Contralto', 'Contralto',
            'Soprano', 'Soprano', 'Soprano',
            'Tenor', 'Tenor', 'Tenor'
          ];
          db.members.forEach((m, idx) => {
            m.primaryRole = rolesCycle[idx % rolesCycle.length];
          });
          localDb.save();
          return { success: true, message: 'Funções de demonstração atribuídas aos 51 integrantes!' };
        }
        if (action === 'simulate_availability') {
          const targetMonth = month || '2026-11';
          const cultos = db.cultos.filter((c) => c.date.startsWith(targetMonth));
          const now = new Date().toISOString();
          for (const m of db.members) {
            if (!m.primaryRole) continue;
            for (const c of cultos) {
              const isAvail = Math.random() > 0.25;
              const idx = db.availabilities.findIndex(
                (a) => a.memberId === m.id && a.cultoId === c.id
              );
              if (idx >= 0) {
                db.availabilities[idx].status = isAvail ? 'disponivel' : 'indisponivel';
                db.availabilities[idx].roleAtTime = m.primaryRole;
                db.availabilities[idx].updatedAt = now;
              } else {
                db.availabilities.push({
                  id: `av_demo_${m.id}_${c.id}`,
                  memberId: m.id,
                  cultoId: c.id,
                  status: isAvail ? 'disponivel' : 'indisponivel',
                  roleAtTime: m.primaryRole,
                  updatedAt: now
                });
              }
            }
          }
          localDb.save();
          return { success: true, message: 'Disponibilidades simuladas com sucesso para teste!' };
        }
        if (action === 'reset_all') {
          localDb.reset();
          return { success: true, message: 'Sistema restaurado para o estado inicial padrão!' };
        }
      }
      throw e;
    }
  },

  // Substituições
  async getSubstitutions(month?: string) {
    try {
      const q = month ? `?month=${month}` : '';
      return await request<SubstitutionRequest[]>(`/api/substitutions${q}`);
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.getSubstitutions(month);
      }
      throw e;
    }
  },

  async requestSubstitution(participationId: string, cultoId: string, reason?: string) {
    try {
      return await request<{ success: boolean; substitution: SubstitutionRequest }>('/api/substitutions', {
        method: 'POST',
        body: JSON.stringify({ participationId, cultoId, reason })
      });
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const session = getStoredSession();
        if (!session?.member) throw new Error('Faça login para solicitar substituição.');
        return localDb.createSubstitutionRequest({
          participationId,
          cultoId,
          requestedByMemberId: session.member.id,
          reason
        });
      }
      throw e;
    }
  },

  async acceptSubstitution(substitutionId: string) {
    try {
      return await request<{ success: boolean; substitution: SubstitutionRequest }>(
        `/api/substitutions/${substitutionId}/accept`,
        { method: 'POST' }
      );
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        const session = getStoredSession();
        if (!session?.member) throw new Error('Faça login para assumir esta vaga.');
        return localDb.acceptSubstitution(substitutionId, session.member.id);
      }
      throw e;
    }
  },

  async cancelSubstitution(substitutionId: string) {
    try {
      return await request<{ success: boolean; message: string }>(
        `/api/substitutions/${substitutionId}/cancel`,
        { method: 'POST' }
      );
    } catch (e: any) {
      if (e.message === 'STATIC_MODE' || isOfflineOrStatic) {
        return localDb.cancelSubstitution(substitutionId);
      }
      throw e;
    }
  }
};
