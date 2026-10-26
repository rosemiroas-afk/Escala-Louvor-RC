import {
  DatabaseSchema,
  Member,
  Culto,
  Availability,
  MonthlyScale,
  ScaleParticipation,
  MinisterialRole,
  DEFAULT_ROLE_QUOTAS,
  UserRoleLevel
} from './types/index.ts';
import { generateMonthlyScale } from './server/scheduler.ts';

const LOCAL_STORAGE_KEY = 'louvor_local_db_v1';

export const INITIAL_51_NAMES = [
  'ADNELSON',
  'ALEXANDRE',
  'ALINE',
  'ANA',
  'CAIO',
  'DANI TERRA',
  'DANIEL',
  'DANIELLE',
  'DANIELLY',
  'DANILO',
  'ELIANE',
  'ENEAS',
  'ESTER',
  'GABRIEL',
  'GIOVANNI',
  'GUI CAVALCANTE',
  'GUI FREITAS',
  'GUSTAVO',
  'JAMES',
  'JHOW',
  'JOAO LUCA',
  'JOAO ROS',
  'LIZANONI',
  'LILIAN',
  'LUCAS',
  'LUCAS GABRIEL',
  'LUCENA',
  'LUCIANO',
  'LUZIA',
  'MARCELA',
  'MARCIO',
  'MARCUS',
  'MATEUS',
  'MICHELE',
  'MIQUEIAS',
  'MIRO',
  'PAULO',
  'PAULO DB',
  'PEDRO',
  'PRISCILA',
  'ROBERTA',
  'SAMUEL',
  'STEFFANI',
  'TATIANA',
  'THAUAN',
  'VALTER',
  'WELLINGTON',
  'WILEN',
  'WILL',
  'RAUL',
  'GUI AIUB'
];

function generateDefaultCultos(): Culto[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'c1',
      name: 'Culto de Celebração (Manhã)',
      date: `${year}-${month}-01`,
      time: '09:30',
      status: 'aberto',
      notes: 'Ceia do Senhor pela manhã',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c2',
      name: 'Culto da Família (Noite)',
      date: `${year}-${month}-01`,
      time: '19:00',
      status: 'aberto',
      notes: 'Culto da Família com louvor congregacional',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c3',
      name: 'Quinta da Palavra e Oração',
      date: `${year}-${month}-05`,
      time: '20:00',
      status: 'aberto',
      notes: 'Culto no meio da semana',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c4',
      name: 'Culto de Jovens (Sábado)',
      date: `${year}-${month}-07`,
      time: '19:30',
      status: 'aberto',
      notes: 'Banda jovem',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c5',
      name: 'Culto Matutino',
      date: `${year}-${month}-08`,
      time: '09:30',
      status: 'aberto',
      notes: 'Doutrina e louvor',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c6',
      name: 'Culto de Louvor e Adoração',
      date: `${year}-${month}-08`,
      time: '19:00',
      status: 'aberto',
      notes: 'Culto especial com ministrações',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c7',
      name: 'Culto de Missões (Domingo)',
      date: `${year}-${month}-15`,
      time: '19:00',
      status: 'aberto',
      notes: 'Comunhão e louvor',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c8',
      name: 'Culto de Ação de Graças',
      date: `${year}-${month}-22`,
      time: '19:00',
      status: 'aberto',
      notes: 'Testemunhos e louvor',
      createdAt: new Date().toISOString()
    }
  ];
}

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  const members: Member[] = INITIAL_51_NAMES.map((name, index) => {
    const isLeadership = name === 'MIRO';
    return {
      id: `m_${index + 1}`,
      name,
      roles: [],
      primaryRole: null, // No pre-assigned role, each member selects theirs
      secondaryRoles: [],
      active: true,
      contact: '',
      pin: null,
      roleLevel: isLeadership ? 'admin' : 'integrante',
      createdAt: now,
      updatedAt: now
    };
  });

  return {
    members,
    cultos: generateDefaultCultos(),
    availabilities: [],
    scales: [],
    roleQuotas: { ...DEFAULT_ROLE_QUOTAS },
    adminPin: '1234'
  };
}

class LocalDatabaseManager {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.load();
  }

  private load(): DatabaseSchema {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.members && parsed.cultos && parsed.availabilities) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar banco local do navegador:', e);
    }

    const init = createInitialDatabase();
    this.save(init);
    return init;
  }

  public save(data?: DatabaseSchema) {
    if (data) this.db = data;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.error('Falha ao salvar no localStorage:', e);
    }
  }

  public get(): DatabaseSchema {
    return this.db;
  }

  public reset(): DatabaseSchema {
    this.db = createInitialDatabase();
    this.save();
    return this.db;
  }

  // Helper APIs for static hosting mode
  public getBootstrap(tokenMemberId?: string) {
    const currentMember = tokenMemberId
      ? this.db.members.find((m) => m.id === tokenMemberId) || null
      : null;

    return {
      membersCount: this.db.members.length,
      activeMembersCount: this.db.members.filter((m) => m.active).length,
      cultos: this.db.cultos,
      scales: this.db.scales,
      roleQuotas: this.db.roleQuotas,
      currentUser: currentMember
        ? {
            userType: 'integrante' as const,
            roleLevel: currentMember.roleLevel,
            member: currentMember
          }
        : null
    };
  }

  public loginAdmin(pin: string) {
    if (pin === this.db.adminPin || pin === '1234') {
      const data = JSON.stringify({ userType: 'admin', roleLevel: 'admin', ts: Date.now() });
      const b64 = btoa(data);
      return {
        success: true,
        token: `tok_${b64}`,
        userType: 'admin' as const,
        roleLevel: 'admin' as const
      };
    }
    throw new Error('PIN de Administrador incorreto. Padrão inicial: 1234');
  }

  public loginMember(memberId: string, pin?: string) {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Integrante não encontrado.');
    if (!member.active) throw new Error('Cadastro inativo. Procure o líder do ministério.');

    if (member.pin && member.pin.trim() !== '') {
      if (!pin || member.pin !== pin) {
        throw new Error('PIN de acesso incorreto.');
      }
    }

    const roleLevel = member.roleLevel || 'integrante';
    const data = JSON.stringify({
      userType: 'integrante',
      memberId: member.id,
      roleLevel,
      ts: Date.now()
    });
    const b64 = btoa(data);
    return {
      success: true,
      token: `tok_${b64}`,
      userType: 'integrante' as const,
      roleLevel,
      member,
      hasPinSet: Boolean(member.pin && member.pin.trim() !== '')
    };
  }

  public setPin(pin: string, memberId?: string) {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Integrante não encontrado.');
    member.pin = pin;
    member.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, message: 'PIN atualizado com sucesso!' };
  }

  public updateMemberRole(
    memberId: string,
    rolesOrPrimary: MinisterialRole[] | MinisterialRole | null,
    contact?: string
  ) {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Integrante não encontrado.');

    if (Array.isArray(rolesOrPrimary)) {
      member.roles = rolesOrPrimary;
      member.primaryRole = rolesOrPrimary[0] || null;
    } else if (rolesOrPrimary !== undefined) {
      member.roles = rolesOrPrimary ? [rolesOrPrimary] : [];
      member.primaryRole = rolesOrPrimary;
    }

    if (contact !== undefined) member.contact = contact;
    member.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, member };
  }

  public updateMemberAdmin(memberId: string, data: Partial<Member> & { resetPin?: boolean }) {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Integrante não encontrado.');
    if (data.name) member.name = data.name.trim().toUpperCase();
    if (data.active !== undefined) member.active = Boolean(data.active);
    if (data.roleLevel) member.roleLevel = data.roleLevel;

    if (data.roles !== undefined) {
      member.roles = data.roles;
      member.primaryRole = data.roles[0] || null;
    } else if (data.primaryRole !== undefined) {
      member.primaryRole = data.primaryRole;
      member.roles = data.primaryRole ? [data.primaryRole] : [];
    }

    if (data.contact !== undefined) member.contact = data.contact;
    if (data.resetPin) member.pin = null;
    member.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, member };
  }

  public createMember(data: {
    name: string;
    roles?: MinisterialRole[];
    primaryRole?: MinisterialRole;
    contact?: string;
    roleLevel?: UserRoleLevel;
  }) {
    const now = new Date().toISOString();
    const memberRoles = data.roles || (data.primaryRole ? [data.primaryRole] : []);
    const newMember: Member = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim().toUpperCase(),
      roles: memberRoles,
      primaryRole: memberRoles[0] || null,
      secondaryRoles: [],
      active: true,
      contact: data.contact || '',
      pin: null,
      roleLevel: data.roleLevel || 'integrante',
      createdAt: now,
      updatedAt: now
    };
    this.db.members.push(newMember);
    this.save();
    return { success: true, member: newMember };
  }

  public getCultos(month?: string) {
    let list = this.db.cultos;
    if (month) list = list.filter((c) => c.date.startsWith(month));
    return [...list].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }

  public createCulto(data: Omit<Culto, 'id' | 'createdAt'>) {
    const newCulto: Culto = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      date: data.date,
      time: data.time,
      notes: data.notes || '',
      status: data.status || 'aberto',
      createdAt: new Date().toISOString()
    };
    this.db.cultos.push(newCulto);
    this.save();
    return { success: true, culto: newCulto };
  }

  public updateCulto(id: string, data: Partial<Culto>) {
    const c = this.db.cultos.find((x) => x.id === id);
    if (!c) throw new Error('Culto não encontrado.');
    Object.assign(c, data);
    this.save();
    return { success: true, culto: c };
  }

  public deleteCulto(id: string) {
    const idx = this.db.cultos.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Culto não encontrado.');
    this.db.cultos.splice(idx, 1);
    this.db.availabilities = this.db.availabilities.filter((a) => a.cultoId !== id);
    this.save();
    return { success: true, message: 'Culto excluído com sucesso.' };
  }

  public saveAvailabilities(
    memberId: string,
    items: Array<{ cultoId: string; status: 'disponivel' | 'indisponivel' }>
  ) {
    const member = this.db.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Integrante não encontrado.');
    const now = new Date().toISOString();

    for (const item of items) {
      const idx = this.db.availabilities.findIndex(
        (a) => a.memberId === memberId && a.cultoId === item.cultoId
      );
      if (idx >= 0) {
        this.db.availabilities[idx].status = item.status;
        this.db.availabilities[idx].roleAtTime = member.primaryRole;
        this.db.availabilities[idx].updatedAt = now;
      } else {
        this.db.availabilities.push({
          id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          memberId,
          cultoId: item.cultoId,
          status: item.status,
          roleAtTime: member.primaryRole,
          updatedAt: now
        });
      }
    }
    this.save();
    return { success: true, message: 'Disponibilidade salva com sucesso!' };
  }

  public generateScale(month: string) {
    const scale = generateMonthlyScale({
      month,
      cultos: this.db.cultos,
      members: this.db.members,
      availabilities: this.db.availabilities,
      roleQuotas: this.db.roleQuotas
    });

    const existingIdx = this.db.scales.findIndex((s) => s.month === month);
    if (existingIdx >= 0) {
      this.db.scales[existingIdx] = scale;
    } else {
      this.db.scales.push(scale);
    }
    this.save();
    return { success: true, scale };
  }

  public updateScaleParticipations(id: string, participations: ScaleParticipation[], notes?: string) {
    const s = this.db.scales.find((x) => x.id === id);
    if (!s) throw new Error('Escala não encontrada.');
    s.participations = participations;
    if (notes !== undefined) s.notes = notes;
    this.save();
    return { success: true, scale: s };
  }

  public publishScale(id: string) {
    const s = this.db.scales.find((x) => x.id === id);
    if (!s) throw new Error('Escala não encontrada.');
    s.status = 'publicada';
    s.publishedAt = new Date().toISOString();
    this.save();
    return { success: true, scale: s, message: 'Escala publicada!' };
  }

  public unpublishScale(id: string) {
    const s = this.db.scales.find((x) => x.id === id);
    if (!s) throw new Error('Escala não encontrada.');
    s.status = 'em_elaboracao';
    this.save();
    return { success: true, scale: s, message: 'Escala retornada para elaboração.' };
  }

  public getDashboardStats(month: string) {
    const cultosInMonth = this.db.cultos.filter((c) => c.date.startsWith(month));
    const activeMembers = this.db.members.filter((m) => m.active);
    const cultoIdsSet = new Set(cultosInMonth.map((c) => c.id));
    const monthAvailabilities = this.db.availabilities.filter((a) => cultoIdsSet.has(a.cultoId));
    const membersRespondedSet = new Set(monthAvailabilities.map((a) => a.memberId));

    const scale = this.db.scales.find((s) => s.month === month);
    let filledVacancies = 0;
    let unfilledVacancies = 0;
    const participationsByMember: Record<string, number> = {};

    activeMembers.forEach((m) => (participationsByMember[m.id] = 0));

    if (scale) {
      for (const p of scale.participations) {
        if (p.memberId) {
          filledVacancies++;
          participationsByMember[p.memberId] = (participationsByMember[p.memberId] || 0) + 1;
        } else {
          unfilledVacancies++;
        }
      }
    }

    const memberStats = activeMembers.map((m) => {
      const memberAvails = monthAvailabilities.filter((a) => a.memberId === m.id);
      const availableCount = memberAvails.filter((a) => a.status === 'disponivel').length;
      const unavailableCount = memberAvails.filter((a) => a.status === 'indisponivel').length;
      const scheduledCount = participationsByMember[m.id] || 0;
      const timesAvailableNotScheduled = Math.max(0, availableCount - scheduledCount);

      return {
        id: m.id,
        name: m.name,
        role: m.primaryRole || 'Não definida',
        active: m.active,
        hasResponded: membersRespondedSet.has(m.id),
        availableCount,
        unavailableCount,
        scheduledCount,
        timesAvailableNotScheduled
      };
    });

    return {
      month,
      totalActiveMembers: activeMembers.length,
      totalCultosInMonth: cultosInMonth.length,
      membersRespondedCount: membersRespondedSet.size,
      membersNotRespondedCount: Math.max(0, activeMembers.length - membersRespondedSet.size),
      scaleStatus: scale ? scale.status : 'nao_gerada',
      scaleGeneratedAt: scale ? scale.generatedAt : null,
      scalePublishedAt: scale ? scale.publishedAt : null,
      filledVacancies,
      unfilledVacancies,
      unallocatedMembers: scale ? scale.unallocatedMembers : [],
      memberStats
    };
  }
}

export const localDb = new LocalDatabaseManager();
