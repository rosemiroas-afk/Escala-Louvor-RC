export type MinisterialRole =
  | 'Ministro'
  | 'Guitarrista'
  | 'Tecladista'
  | 'Violonista'
  | 'Baterista'
  | 'Baixista'
  | 'Contralto'
  | 'Soprano'
  | 'Tenor';

export const ALL_ROLES: MinisterialRole[] = [
  'Ministro',
  'Guitarrista',
  'Tecladista',
  'Violonista',
  'Baterista',
  'Baixista',
  'Contralto',
  'Soprano',
  'Tenor'
];

export const DEFAULT_ROLE_QUOTAS: Record<MinisterialRole, number> = {
  Ministro: 3,
  Guitarrista: 1,
  Tecladista: 1,
  Violonista: 1,
  Baterista: 1,
  Baixista: 1,
  Contralto: 2,
  Soprano: 2,
  Tenor: 2
};

export type UserRoleLevel = 'integrante' | 'lider' | 'admin';

export type CultoStatus = 'aberto' | 'em_elaboracao' | 'publicado' | 'realizado';

export type AvailabilityStatus = 'disponivel' | 'indisponivel' | 'nao_informado';

export interface Member {
  id: string;
  name: string;
  primaryRole: MinisterialRole | null;
  secondaryRoles?: MinisterialRole[];
  active: boolean;
  contact?: string;
  pin?: string | null;
  roleLevel: UserRoleLevel;
  createdAt: string;
  updatedAt: string;
}

export interface Culto {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: CultoStatus;
  notes?: string;
  createdAt: string;
}

export interface Availability {
  id: string;
  memberId: string;
  cultoId: string;
  status: AvailabilityStatus;
  roleAtTime?: MinisterialRole | null;
  updatedAt: string;
}

export interface ScaleParticipation {
  id: string;
  cultoId: string;
  memberId: string | null; // null if unfulfilled ("Não preenchida")
  memberName?: string;
  role: MinisterialRole;
  status: 'confirmado' | 'vaga_aberta';
}

export interface MonthlyScale {
  id: string;
  month: string; // YYYY-MM
  status: 'em_elaboracao' | 'publicada';
  generatedAt: string;
  publishedAt?: string | null;
  notes?: string;
  participations: ScaleParticipation[];
  unallocatedMembers: Array<{
    memberId: string;
    memberName: string;
    role: MinisterialRole;
    reason: string;
    availableCount: number;
  }>;
}

export interface DatabaseSchema {
  members: Member[];
  cultos: Culto[];
  availabilities: Availability[];
  scales: MonthlyScale[];
  roleQuotas: Record<MinisterialRole, number>;
  adminPin: string;
}

export interface AuthSession {
  userType: 'admin' | 'integrante';
  member?: Member;
  roleLevel: UserRoleLevel;
  token: string;
}
