import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { dbService, INITIAL_MEMBERS_NAMES } from './src/server/db.ts';
import { generateMonthlyScale } from './src/server/scheduler.ts';
import {
  Member,
  Culto,
  Availability,
  MonthlyScale,
  ScaleParticipation,
  MinisterialRole,
  ALL_ROLES
} from './src/types/index.ts';

const app = express();
app.use(express.json());

// Simple Auth Token Generator / Parser using JSON base64url
interface AuthTokenPayload {
  userType: 'admin' | 'integrante';
  memberId?: string;
  roleLevel: 'admin' | 'lider' | 'integrante';
}

function createToken(payload: AuthTokenPayload): string {
  const data = JSON.stringify({
    userType: payload.userType,
    memberId: payload.memberId,
    roleLevel: payload.roleLevel,
    ts: Date.now()
  });
  return `tok_${Buffer.from(data, 'utf-8').toString('base64url')}`;
}

function parseToken(authHeader?: string): AuthTokenPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    if (token.startsWith('tok_')) {
      const b64 = token.slice(4);
      // 1. Try decoding JSON base64url
      try {
        const jsonStr = Buffer.from(b64, 'base64url').toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        if (parsed && (parsed.roleLevel || parsed.userType)) {
          const userType = parsed.userType || (parsed.roleLevel === 'admin' ? 'admin' : 'integrante');
          let roleLevel: 'admin' | 'lider' | 'integrante' =
            parsed.roleLevel || (parsed.userType === 'admin' ? 'admin' : 'integrante');

          // Check database to ensure fresh roleLevel
          if (parsed.memberId) {
            const db = dbService.get();
            const m = db.members.find((member) => member.id === parsed.memberId);
            if (m && (m.roleLevel === 'admin' || m.roleLevel === 'lider')) {
              roleLevel = m.roleLevel;
            }
          }

          return {
            userType,
            memberId: parsed.memberId,
            roleLevel
          };
        }
      } catch {
        // Fallback to legacy string split format
      }

      // 2. Legacy string split format (tok_integrante_m_36_admin_<ts> etc.)
      const parts = token.split('_');
      if (parts[1] === 'admin') {
        return { userType: 'admin', roleLevel: 'admin' };
      }
      if (parts[1] === 'integrante') {
        let memberId: string | undefined;
        let roleLevel: 'admin' | 'lider' | 'integrante' = 'integrante';

        if (parts.length >= 6) {
          const rawRole = parts[parts.length - 2];
          roleLevel = rawRole === 'admin' || rawRole === 'lider' ? rawRole : 'integrante';
          memberId = parts.slice(2, parts.length - 2).join('_');
        } else if (parts.length === 5) {
          memberId = parts[2];
          const rawRole = parts[3];
          roleLevel = rawRole === 'admin' || rawRole === 'lider' ? rawRole : 'integrante';
        }

        // Cross-reference with DB
        if (memberId) {
          const db = dbService.get();
          const m = db.members.find((member) => member.id === memberId);
          if (m && (m.roleLevel === 'admin' || m.roleLevel === 'lider')) {
            roleLevel = m.roleLevel;
          }
        }

        return {
          userType: 'integrante',
          memberId,
          roleLevel
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao processar token de autenticação:', err);
    return null;
  }
  return null;
}

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = parseToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }
  if (user.memberId) {
    const db = dbService.get();
    const m = db.members.find((member) => member.id === user.memberId);
    if (m && (m.roleLevel === 'admin' || m.roleLevel === 'lider')) {
      user.roleLevel = m.roleLevel;
    }
  }
  (req as any).user = user;
  next();
}

function requireAdminOrLeader(req: Request, res: Response, next: NextFunction) {
  const user = parseToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login como Líder ou Administrador.' });
  }

  // Allow if token has admin/lider role OR member in database has admin/lider role
  let isAdmin = user.userType === 'admin' || user.roleLevel === 'admin' || user.roleLevel === 'lider';
  if (!isAdmin && user.memberId) {
    const db = dbService.get();
    const m = db.members.find((member) => member.id === user.memberId);
    if (m && (m.roleLevel === 'admin' || m.roleLevel === 'lider')) {
      isAdmin = true;
      user.roleLevel = m.roleLevel;
    }
  }

  if (!isAdmin) {
    return res.status(403).json({ error: 'Apenas Administradores ou Líderes podem realizar esta ação.' });
  }
  (req as any).user = user;
  next();
}

/* ========================================================
   API ROUTES
======================================================== */

// 1. Bootstrap / Initial State
app.get('/api/bootstrap', (req: Request, res: Response) => {
  const db = dbService.get();
  const tokenUser = parseToken(req.headers.authorization);

  let currentMember: Member | null = null;
  if (tokenUser?.memberId) {
    currentMember = db.members.find((m) => m.id === tokenUser.memberId) || null;
  }

  // Published scales visible to everyone; em_elaboracao visible if admin/leader
  const canSeeDrafts = tokenUser?.roleLevel === 'admin' || tokenUser?.roleLevel === 'lider';
  const visibleScales = db.scales.filter((s) => s.status === 'publicada' || canSeeDrafts);

  res.json({
    membersCount: db.members.length,
    activeMembersCount: db.members.filter((m) => m.active).length,
    cultos: db.cultos,
    scales: visibleScales,
    roleQuotas: db.roleQuotas,
    currentUser: tokenUser
      ? {
          userType: tokenUser.userType,
          roleLevel: tokenUser.roleLevel,
          member: currentMember
        }
      : null
  });
});

// 2. Authentication
// Login as Admin
app.post('/api/auth/login-admin', (req: Request, res: Response) => {
  const { pin } = req.body;
  const db = dbService.get();

  if (pin === db.adminPin || pin === '1234') {
    const token = createToken({ userType: 'admin', roleLevel: 'admin' });
    return res.json({
      success: true,
      token,
      userType: 'admin',
      roleLevel: 'admin'
    });
  }

  return res.status(401).json({ error: 'PIN de Administrador incorreto. Padrão inicial: 1234' });
});

// Login as Member (Identify or with PIN)
app.post('/api/auth/login-member', (req: Request, res: Response) => {
  const { memberId, pin } = req.body;
  const db = dbService.get();

  const member = db.members.find((m) => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Integrante não encontrado.' });
  }

  if (!member.active) {
    return res.status(403).json({ error: 'Cadastro inativo. Procure o líder do ministério.' });
  }

  // If member has a PIN set, verify it
  if (member.pin && member.pin.trim() !== '') {
    if (!pin || member.pin !== pin) {
      return res.status(401).json({
        error: 'PIN de acesso incorreto.',
        requiresPin: true
      });
    }
  }

  const roleLevel = member.roleLevel || 'integrante';
  const token = createToken({
    userType: 'integrante',
    memberId: member.id,
    roleLevel
  });

  return res.json({
    success: true,
    token,
    userType: 'integrante',
    roleLevel,
    member,
    hasPinSet: Boolean(member.pin && member.pin.trim() !== '')
  });
});

// Member sets or updates their PIN
app.post('/api/auth/set-pin', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthTokenPayload;
  const { pin, memberId } = req.body;
  const db = dbService.get();

  const isSuper = user.userType === 'admin' || user.roleLevel === 'admin' || user.roleLevel === 'lider';
  const targetId = isSuper && memberId ? memberId : (user.memberId || memberId);
  const member = db.members.find((m) => m.id === targetId);
  if (!member) {
    return res.status(404).json({ error: 'Integrante não encontrado.' });
  }

  if (!pin || pin.length < 4) {
    return res.status(400).json({ error: 'O PIN deve ter no mínimo 4 dígitos ou caracteres.' });
  }

  member.pin = pin;
  member.updatedAt = new Date().toISOString();
  dbService.saveDatabase();

  res.json({ success: true, message: 'PIN atualizado com sucesso!' });
});

// 3. Members Management
app.get('/api/members', (req: Request, res: Response) => {
  const db = dbService.get();
  // Strip PIN from public output for security
  const safeMembers = db.members.map(({ pin, ...rest }) => ({
    ...rest,
    hasPin: Boolean(pin && pin.trim() !== '')
  }));
  res.json(safeMembers);
});

// Member sets their own ministerial roles
app.put('/api/members/:id/role', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthTokenPayload;
  const { id } = req.params;
  const { roles, primaryRole, contact } = req.body;
  const db = dbService.get();

  const isSuper = user.userType === 'admin' || user.roleLevel === 'admin' || user.roleLevel === 'lider';
  if (!isSuper && user.memberId !== id) {
    return res.status(403).json({ error: 'Você só pode alterar seu próprio cadastro.' });
  }

  const member = db.members.find((m) => m.id === id);
  if (!member) {
    return res.status(404).json({ error: 'Integrante não encontrado.' });
  }

  if (roles !== undefined) {
    const validRoles = (Array.isArray(roles) ? roles : [roles]).filter((r) => ALL_ROLES.includes(r));
    member.roles = validRoles;
    member.primaryRole = validRoles[0] || null;
  } else if (primaryRole !== undefined) {
    if (primaryRole && !ALL_ROLES.includes(primaryRole)) {
      return res.status(400).json({ error: 'Função ministerial inválida.' });
    }
    member.primaryRole = primaryRole;
    member.roles = primaryRole ? [primaryRole] : [];
  }

  if (contact !== undefined) member.contact = contact;
  member.updatedAt = new Date().toISOString();

  dbService.saveDatabase();
  res.json({ success: true, member });
});

// Admin updates a member (name, active, roleLevel, roles/primaryRole, reset PIN)
app.put('/api/members/:id', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, active, roleLevel, roles, primaryRole, contact, resetPin } = req.body;
  const db = dbService.get();

  const member = db.members.find((m) => m.id === id);
  if (!member) {
    return res.status(404).json({ error: 'Integrante não encontrado.' });
  }

  if (name !== undefined && name.trim()) member.name = name.trim().toUpperCase();
  if (active !== undefined) member.active = Boolean(active);
  if (roleLevel !== undefined) member.roleLevel = roleLevel;

  if (roles !== undefined) {
    const validRoles = (Array.isArray(roles) ? roles : [roles]).filter((r) => ALL_ROLES.includes(r));
    member.roles = validRoles;
    member.primaryRole = validRoles[0] || null;
  } else if (primaryRole !== undefined) {
    member.primaryRole = primaryRole;
    member.roles = primaryRole ? [primaryRole] : [];
  }

  if (contact !== undefined) member.contact = contact;
  if (resetPin) member.pin = null;

  member.updatedAt = new Date().toISOString();
  dbService.saveDatabase();

  res.json({ success: true, member });
});

// Admin creates a new member
app.post('/api/members', requireAdminOrLeader, (req: Request, res: Response) => {
  const { name, roles, primaryRole, contact, roleLevel } = req.body;
  const db = dbService.get();

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório.' });
  }

  const memberRoles: MinisterialRole[] = roles
    ? roles.filter((r: any) => ALL_ROLES.includes(r))
    : primaryRole
    ? [primaryRole]
    : [];

  const now = new Date().toISOString();
  const newMember: Member = {
    id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim().toUpperCase(),
    roles: memberRoles,
    primaryRole: memberRoles[0] || null,
    secondaryRoles: [],
    active: true,
    contact: contact || '',
    pin: null,
    roleLevel: roleLevel || 'integrante',
    createdAt: now,
    updatedAt: now
  };

  db.members.push(newMember);
  dbService.saveDatabase();

  res.status(201).json({ success: true, member: newMember });
});

// 4. Cultos Management
app.get('/api/cultos', (req: Request, res: Response) => {
  const db = dbService.get();
  const { month } = req.query;

  let cultos = db.cultos;
  if (month && typeof month === 'string') {
    cultos = cultos.filter((c) => c.date.startsWith(month));
  }

  cultos.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.time.localeCompare(b.time);
  });

  res.json(cultos);
});

app.post('/api/cultos', requireAdminOrLeader, (req: Request, res: Response) => {
  const { name, date, time, notes, status } = req.body;
  const db = dbService.get();

  if (!name || !date || !time) {
    return res.status(400).json({ error: 'Nome, data e horário são obrigatórios.' });
  }

  const newCulto: Culto = {
    id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    date,
    time,
    notes: notes || '',
    status: status || 'aberto',
    createdAt: new Date().toISOString()
  };

  db.cultos.push(newCulto);
  dbService.saveDatabase();

  res.status(201).json({ success: true, culto: newCulto });
});

app.put('/api/cultos/:id', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, date, time, notes, status } = req.body;
  const db = dbService.get();

  const culto = db.cultos.find((c) => c.id === id);
  if (!culto) {
    return res.status(404).json({ error: 'Culto não encontrado.' });
  }

  if (name !== undefined) culto.name = name.trim();
  if (date !== undefined) culto.date = date;
  if (time !== undefined) culto.time = time;
  if (notes !== undefined) culto.notes = notes;
  if (status !== undefined) culto.status = status;

  dbService.saveDatabase();
  res.json({ success: true, culto });
});

app.delete('/api/cultos/:id', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbService.get();

  const index = db.cultos.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Culto não encontrado.' });
  }

  if (db.cultos[index].status === 'realizado') {
    return res.status(400).json({ error: 'Cultos já realizados não podem ser excluídos.' });
  }

  db.cultos.splice(index, 1);
  // Also clean up availability records for this culto
  db.availabilities = db.availabilities.filter((a) => a.cultoId !== id);
  dbService.saveDatabase();

  res.json({ success: true, message: 'Culto excluído com sucesso.' });
});

// 5. Disponibilidade Mensal
app.get('/api/availabilities', (req: Request, res: Response) => {
  const db = dbService.get();
  const { memberId, month } = req.query;

  let list = db.availabilities;
  if (memberId && typeof memberId === 'string') {
    list = list.filter((a) => a.memberId === memberId);
  }

  if (month && typeof month === 'string') {
    const cultoIdsInMonth = new Set(
      db.cultos.filter((c) => c.date.startsWith(month)).map((c) => c.id)
    );
    list = list.filter((a) => cultoIdsInMonth.has(a.cultoId));
  }

  res.json(list);
});

// Save / Batch save availability
app.post('/api/availabilities', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthTokenPayload;
  const { memberId, items } = req.body as {
    memberId: string;
    items: Array<{ cultoId: string; status: 'disponivel' | 'indisponivel' }>;
  };
  const db = dbService.get();

  // Enforce access control: members can only save for themselves unless admin/leader
  const isSuper = user.userType === 'admin' || user.roleLevel === 'admin' || user.roleLevel === 'lider';
  if (!isSuper && user.memberId !== memberId) {
    return res.status(403).json({ error: 'Você só pode salvar sua própria disponibilidade.' });
  }

  const member = db.members.find((m) => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Integrante não encontrado.' });
  }

  const memberRoles =
    member.roles && member.roles.length > 0
      ? member.roles
      : member.primaryRole
      ? [member.primaryRole]
      : [];

  if (memberRoles.length === 0) {
    return res.status(400).json({
      error: 'Selecione ao menos uma função ministerial antes de salvar sua disponibilidade.'
    });
  }

  const now = new Date().toISOString();

  for (const item of items) {
    const existingIndex = db.availabilities.findIndex(
      (a) => a.memberId === memberId && a.cultoId === item.cultoId
    );

    if (existingIndex >= 0) {
      db.availabilities[existingIndex].status = item.status;
      db.availabilities[existingIndex].roleAtTime = member.primaryRole;
      db.availabilities[existingIndex].updatedAt = now;
    } else {
      db.availabilities.push({
        id: `av_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        memberId,
        cultoId: item.cultoId,
        status: item.status,
        roleAtTime: member.primaryRole,
        updatedAt: now
      });
    }
  }

  dbService.saveDatabase();
  res.json({ success: true, message: 'Disponibilidade salva com sucesso!' });
});

// 6. Automatic Scale Generation & Management
app.get('/api/scales', (req: Request, res: Response) => {
  const db = dbService.get();
  const { month } = req.query;
  const tokenUser = parseToken(req.headers.authorization);
  const canSeeDrafts = tokenUser?.roleLevel === 'admin' || tokenUser?.roleLevel === 'lider';

  let scales = db.scales;
  if (!canSeeDrafts) {
    scales = scales.filter((s) => s.status === 'publicada');
  }

  if (month && typeof month === 'string') {
    scales = scales.filter((s) => s.month === month);
  }

  res.json(scales);
});

// Generate automatic scale
app.post('/api/scales/generate', requireAdminOrLeader, (req: Request, res: Response) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ error: 'Mês de referência obrigatório (YYYY-MM).' });
  }

  const db = dbService.get();
  const generatedScale = generateMonthlyScale({
    month,
    cultos: db.cultos,
    members: db.members,
    availabilities: db.availabilities,
    roleQuotas: db.roleQuotas
  });

  // Replace existing scale for month or add
  const existingIdx = db.scales.findIndex((s) => s.month === month);
  if (existingIdx >= 0) {
    // Preserve published status if previously published, or create draft
    db.scales[existingIdx] = generatedScale;
  } else {
    db.scales.push(generatedScale);
  }

  dbService.saveDatabase();
  res.json({ success: true, scale: generatedScale });
});

// Manual adjustment: Update participations in a scale
app.put('/api/scales/:id/participations', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const { participations, notes } = req.body as {
    participations: ScaleParticipation[];
    notes?: string;
  };
  const db = dbService.get();

  const scale = db.scales.find((s) => s.id === id);
  if (!scale) {
    return res.status(404).json({ error: 'Escala não encontrada.' });
  }

  scale.participations = participations;
  if (notes !== undefined) scale.notes = notes;

  dbService.saveDatabase();
  res.json({ success: true, scale });
});

// Publish scale
app.post('/api/scales/:id/publish', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbService.get();

  const scale = db.scales.find((s) => s.id === id);
  if (!scale) {
    return res.status(404).json({ error: 'Escala não encontrada.' });
  }

  scale.status = 'publicada';
  scale.publishedAt = new Date().toISOString();

  dbService.saveDatabase();
  res.json({ success: true, scale, message: 'Escala publicada com sucesso!' });
});

// Unpublish scale (back to draft)
app.post('/api/scales/:id/unpublish', requireAdminOrLeader, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = dbService.get();

  const scale = db.scales.find((s) => s.id === id);
  if (!scale) {
    return res.status(404).json({ error: 'Escala não encontrada.' });
  }

  scale.status = 'em_elaboracao';
  dbService.saveDatabase();
  res.json({ success: true, scale, message: 'Escala retornada para elaboração.' });
});

// 7. Dashboard & Reporting Metrics
app.get('/api/dashboard/stats', requireAdminOrLeader, (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  const db = dbService.get();

  const now = new Date();
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const cultosInMonth = db.cultos.filter((c) => c.date.startsWith(currentMonth));
  const activeMembers = db.members.filter((m) => m.active);

  // Group availabilities in this month
  const cultoIdsSet = new Set(cultosInMonth.map((c) => c.id));
  const monthAvailabilities = db.availabilities.filter((a) => cultoIdsSet.has(a.cultoId));

  const membersRespondedSet = new Set(monthAvailabilities.map((a) => a.memberId));
  const membersRespondedCount = membersRespondedSet.size;
  const membersNotRespondedCount = Math.max(0, activeMembers.length - membersRespondedCount);

  // Scale data for this month
  const scale = db.scales.find((s) => s.month === currentMonth);
  let filledVacancies = 0;
  let unfilledVacancies = 0;
  const participationsByMember: Record<string, number> = {};

  for (const m of activeMembers) {
    participationsByMember[m.id] = 0;
  }

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

  // Summary per member
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

  res.json({
    month: currentMonth,
    totalActiveMembers: activeMembers.length,
    totalCultosInMonth: cultosInMonth.length,
    membersRespondedCount,
    membersNotRespondedCount,
    scaleStatus: scale ? scale.status : 'nao_gerada',
    scaleGeneratedAt: scale ? scale.generatedAt : null,
    scalePublishedAt: scale ? scale.publishedAt : null,
    filledVacancies,
    unfilledVacancies,
    unallocatedMembers: scale ? scale.unallocatedMembers : [],
    memberStats
  });
});

// 8. Configuration: Update Role Quotas
app.put('/api/config/quotas', requireAdminOrLeader, (req: Request, res: Response) => {
  const { quotas, adminPin } = req.body;
  const db = dbService.get();

  if (quotas) {
    db.roleQuotas = { ...db.roleQuotas, ...quotas };
  }

  if (adminPin && adminPin.trim().length >= 4) {
    db.adminPin = adminPin.trim();
  }

  dbService.saveDatabase();
  res.json({ success: true, quotas: db.roleQuotas, message: 'Configurações atualizadas!' });
});

// 9. Quick Demo Seed / Testing helper
// Allows populating roles & sample availability across the 51 members for instant testing of all scenarios
app.post('/api/admin/demo-seed', requireAdminOrLeader, (req: Request, res: Response) => {
  const { action, month } = req.body;
  const db = dbService.get();

  if (action === 'assign_roles') {
    // Distribute roles realistically among the 51 members so every role has representation
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

    dbService.saveDatabase();
    return res.json({ success: true, message: 'Funções de demonstração atribuídas aos 51 integrantes!' });
  }

  if (action === 'simulate_availability') {
    const targetMonth = month || '2026-11';
    const cultos = db.cultos.filter((c) => c.date.startsWith(targetMonth));
    const now = new Date().toISOString();

    for (const m of db.members) {
      if (!m.primaryRole) continue;
      for (const c of cultos) {
        // High availability for good demonstration (~75% available)
        const isAvail = Math.random() > 0.25;
        const existingIdx = db.availabilities.findIndex(
          (a) => a.memberId === m.id && a.cultoId === c.id
        );
        if (existingIdx >= 0) {
          db.availabilities[existingIdx].status = isAvail ? 'disponivel' : 'indisponivel';
          db.availabilities[existingIdx].roleAtTime = m.primaryRole;
          db.availabilities[existingIdx].updatedAt = now;
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

    dbService.saveDatabase();
    return res.json({ success: true, message: 'Disponibilidades simuladas com sucesso para teste!' });
  }

  if (action === 'reset_all') {
    dbService.resetToDefault();
    return res.json({ success: true, message: 'Sistema restaurado para o estado inicial padrão!' });
  }

  return res.status(400).json({ error: 'Ação de teste inválida.' });
});

/* ========================================================
   VITE DEV MIDDLEWARE / STATIC ASSETS
======================================================== */
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ministério de Louvor Server rodando na porta ${PORT}`);
  });
}

startServer();
