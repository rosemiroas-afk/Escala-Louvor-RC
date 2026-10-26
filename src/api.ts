import {
  Member,
  Culto,
  Availability,
  MonthlyScale,
  ScaleParticipation,
  MinisterialRole,
  UserRoleLevel
} from './types/index.ts';

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Bootstrap
  async getBootstrap() {
    return request<{
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
  },

  // Auth
  async loginAdmin(pin: string) {
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
  },

  async loginMember(memberId: string, pin?: string) {
    const res = await request<{
      success: boolean;
      token: string;
      userType: 'integrante';
      roleLevel: UserRoleLevel;
      member: Member;
      hasPinSet: boolean;
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
  },

  async setPin(pin: string, memberId?: string) {
    return request<{ success: boolean; message: string }>('/api/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, memberId })
    });
  },

  logout() {
    setStoredSession(null);
  },

  // Members
  async getMembers() {
    return request<Array<Member & { hasPin: boolean }>>('/api/members');
  },

  async updateMemberRole(memberId: string, primaryRole: MinisterialRole | null, contact?: string) {
    return request<{ success: boolean; member: Member }>(`/api/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ primaryRole, contact })
    });
  },

  async updateMemberAdmin(memberId: string, data: Partial<Member> & { resetPin?: boolean }) {
    return request<{ success: boolean; member: Member }>(`/api/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async createMember(data: { name: string; primaryRole?: MinisterialRole; contact?: string; roleLevel?: UserRoleLevel }) {
    return request<{ success: boolean; member: Member }>('/api/members', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Cultos
  async getCultos(month?: string) {
    const q = month ? `?month=${month}` : '';
    return request<Culto[]>(`/api/cultos${q}`);
  },

  async createCulto(data: Omit<Culto, 'id' | 'createdAt'>) {
    return request<{ success: boolean; culto: Culto }>('/api/cultos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCulto(id: string, data: Partial<Culto>) {
    return request<{ success: boolean; culto: Culto }>(`/api/cultos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCulto(id: string) {
    return request<{ success: boolean; message: string }>(`/api/cultos/${id}`, {
      method: 'DELETE'
    });
  },

  // Availabilities
  async getAvailabilities(month?: string, memberId?: string) {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (memberId) params.set('memberId', memberId);
    return request<Availability[]>(`/api/availabilities?${params.toString()}`);
  },

  async saveAvailabilities(
    memberId: string,
    items: Array<{ cultoId: string; status: 'disponivel' | 'indisponivel' }>
  ) {
    return request<{ success: boolean; message: string }>('/api/availabilities', {
      method: 'POST',
      body: JSON.stringify({ memberId, items })
    });
  },

  // Scales
  async getScales(month?: string) {
    const q = month ? `?month=${month}` : '';
    return request<MonthlyScale[]>(`/api/scales${q}`);
  },

  async generateScale(month: string) {
    return request<{ success: boolean; scale: MonthlyScale }>('/api/scales/generate', {
      method: 'POST',
      body: JSON.stringify({ month })
    });
  },

  async updateScaleParticipations(id: string, participations: ScaleParticipation[], notes?: string) {
    return request<{ success: boolean; scale: MonthlyScale }>(`/api/scales/${id}/participations`, {
      method: 'PUT',
      body: JSON.stringify({ participations, notes })
    });
  },

  async publishScale(id: string) {
    return request<{ success: boolean; scale: MonthlyScale; message: string }>(
      `/api/scales/${id}/publish`,
      { method: 'POST' }
    );
  },

  async unpublishScale(id: string) {
    return request<{ success: boolean; scale: MonthlyScale; message: string }>(
      `/api/scales/${id}/unpublish`,
      { method: 'POST' }
    );
  },

  // Dashboard Stats
  async getDashboardStats(month: string) {
    return request<{
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
  },

  // Config & Admin Actions
  async updateQuotas(quotas: Record<MinisterialRole, number>, adminPin?: string) {
    return request<{ success: boolean; quotas: Record<MinisterialRole, number>; message: string }>(
      '/api/config/quotas',
      {
        method: 'PUT',
        body: JSON.stringify({ quotas, adminPin })
      }
    );
  },

  async triggerDemoAction(action: 'assign_roles' | 'simulate_availability' | 'reset_all', month?: string) {
    return request<{ success: boolean; message: string }>('/api/admin/demo-seed', {
      method: 'POST',
      body: JSON.stringify({ action, month })
    });
  }
};
