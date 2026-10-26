import {
  Member,
  Culto,
  Availability,
  MonthlyScale,
  ScaleParticipation,
  MinisterialRole,
  ALL_ROLES
} from '../types/index.ts';

interface GenerationOptions {
  month: string; // YYYY-MM
  cultos: Culto[];
  members: Member[];
  availabilities: Availability[];
  roleQuotas: Record<MinisterialRole, number>;
}

export function generateMonthlyScale(options: GenerationOptions): MonthlyScale {
  const { month, cultos, members, availabilities, roleQuotas } = options;

  // Filter cultos for the target month and sort chronologically
  const monthCultos = cultos
    .filter((c) => c.date.startsWith(month))
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.time.localeCompare(b.time);
    });

  // Active members only
  const activeMembers = members.filter((m) => m.active && m.primaryRole);
  const memberMap = new Map<string, Member>(activeMembers.map((m) => [m.id, m]));

  // Availability lookup: Map<cultoId_memberId, AvailabilityStatus>
  const availabilityMap = new Map<string, boolean>();
  // Also track which cultos a member is available for
  const memberAvailableCultos = new Map<string, Set<string>>();

  for (const a of availabilities) {
    if (a.status === 'disponivel') {
      const key = `${a.cultoId}_${a.memberId}`;
      availabilityMap.set(key, true);

      if (!memberAvailableCultos.has(a.memberId)) {
        memberAvailableCultos.set(a.memberId, new Set());
      }
      memberAvailableCultos.get(a.memberId)!.add(a.cultoId);
    }
  }

  // Count participation across the whole month to ensure fair distribution
  const participationsCount = new Map<string, number>();
  for (const m of activeMembers) {
    participationsCount.set(m.id, 0);
  }

  // Culto assignments tracking: Set of memberIds per culto to enforce no-duplicate-person rule
  const cultoMembersAssigned = new Map<string, Set<string>>();
  for (const c of monthCultos) {
    cultoMembersAssigned.set(c.id, new Set());
  }

  const generatedParticipations: ScaleParticipation[] = [];

  // Group members by their primary role
  const membersByRole = new Map<MinisterialRole, Member[]>();
  for (const role of ALL_ROLES) {
    membersByRole.set(
      role,
      activeMembers.filter((m) => m.primaryRole === role)
    );
  }

  // Round 1: Priority Guarantee - Ensure every available member gets at least 1 participation if possible
  // We evaluate all cultos and all roles
  for (const role of ALL_ROLES) {
    const desiredPerCulto = roleQuotas[role] || 0;
    if (desiredPerCulto <= 0) continue;

    const candidates = membersByRole.get(role) || [];

    // For each culto in the month
    for (const culto of monthCultos) {
      // How many slots for this role have already been filled in this culto?
      const alreadyFilledForRole = generatedParticipations.filter(
        (p) => p.cultoId === culto.id && p.role === role && p.memberId !== null
      ).length;

      const remainingSlotsNeeded = desiredPerCulto - alreadyFilledForRole;
      if (remainingSlotsNeeded <= 0) continue;

      // Find candidates who:
      // 1. Have availability for this culto
      // 2. Are not yet assigned to this culto (no duplicate rule)
      // 3. Haven't participated ANYWHERE yet this month (count === 0)
      const eligibleZeroCount = candidates.filter((m) => {
        const isAvail = availabilityMap.get(`${culto.id}_${m.id}`) === true;
        const notInCulto = !cultoMembersAssigned.get(culto.id)?.has(m.id);
        const zeroParticipations = (participationsCount.get(m.id) || 0) === 0;
        return isAvail && notInCulto && zeroParticipations;
      });

      // Sort eligible zero-count candidates:
      // Prioritize those with FEWEST total available cultos in the month,
      // because they have fewer chances to be scheduled elsewhere!
      eligibleZeroCount.sort((a, b) => {
        const aAvailCount = memberAvailableCultos.get(a.id)?.size || 0;
        const bAvailCount = memberAvailableCultos.get(b.id)?.size || 0;
        return aAvailCount - bAvailCount;
      });

      for (let i = 0; i < remainingSlotsNeeded && i < eligibleZeroCount.length; i++) {
        const chosen = eligibleZeroCount[i];
        generatedParticipations.push({
          id: `part_${culto.id}_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cultoId: culto.id,
          memberId: chosen.id,
          memberName: chosen.name,
          role,
          status: 'confirmado'
        });

        cultoMembersAssigned.get(culto.id)?.add(chosen.id);
        participationsCount.set(chosen.id, (participationsCount.get(chosen.id) || 0) + 1);
      }
    }
  }

  // Round 2: Fair Distribution for remaining slots
  // Now fill remaining needed slots up to desired quota, prioritizing members with the lowest participation count
  for (const role of ALL_ROLES) {
    const desiredPerCulto = roleQuotas[role] || 0;
    if (desiredPerCulto <= 0) continue;

    const candidates = membersByRole.get(role) || [];

    for (const culto of monthCultos) {
      const alreadyFilledForRole = generatedParticipations.filter(
        (p) => p.cultoId === culto.id && p.role === role && p.memberId !== null
      ).length;

      const remainingSlotsNeeded = desiredPerCulto - alreadyFilledForRole;
      if (remainingSlotsNeeded <= 0) continue;

      for (let slot = 0; slot < remainingSlotsNeeded; slot++) {
        // Find all available candidates for this culto, not already in this culto
        const eligible = candidates.filter((m) => {
          const isAvail = availabilityMap.get(`${culto.id}_${m.id}`) === true;
          const notInCulto = !cultoMembersAssigned.get(culto.id)?.has(m.id);
          return isAvail && notInCulto;
        });

        if (eligible.length > 0) {
          // Sort by:
          // 1. Lowest current participationsCount in the month
          // 2. Then fewer total available cultos
          eligible.sort((a, b) => {
            const countA = participationsCount.get(a.id) || 0;
            const countB = participationsCount.get(b.id) || 0;
            if (countA !== countB) return countA - countB;
            const availA = memberAvailableCultos.get(a.id)?.size || 0;
            const availB = memberAvailableCultos.get(b.id)?.size || 0;
            return availA - availB;
          });

          const chosen = eligible[0];
          generatedParticipations.push({
            id: `part_${culto.id}_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            cultoId: culto.id,
            memberId: chosen.id,
            memberName: chosen.name,
            role,
            status: 'confirmado'
          });

          cultoMembersAssigned.get(culto.id)?.add(chosen.id);
          participationsCount.set(chosen.id, (participationsCount.get(chosen.id) || 0) + 1);
        } else {
          // RULE: A falta de integrantes NÃO impede a conclusão da escala!
          // Mark unfilled slot as "vaga_aberta" (memberId: null)
          generatedParticipations.push({
            id: `part_${culto.id}_${role}_unfilled_${slot}`,
            cultoId: culto.id,
            memberId: null,
            role,
            status: 'vaga_aberta'
          });
        }
      }
    }
  }

  // Identify available members who were NOT allocated at all in the month
  const unallocatedMembers: MonthlyScale['unallocatedMembers'] = [];

  for (const member of activeMembers) {
    const memberRole = member.primaryRole!;
    const availableCultosSet = memberAvailableCultos.get(member.id);
    const count = participationsCount.get(member.id) || 0;

    // If member was available for at least one service in this month, but count is 0:
    if (availableCultosSet && availableCultosSet.size > 0 && count === 0) {
      // Determine precise reason
      const roleDesired = roleQuotas[memberRole] || 0;
      let reason = '';

      if (roleDesired <= 0) {
        reason = `Meta de vagas para a função ${memberRole} está definida como 0 no mês.`;
      } else {
        reason = `Todos os cultos em que esteve disponível (${availableCultosSet.size} culto(s)) tiveram suas vagas de ${memberRole} preenchidas por outros integrantes disponíveis com igual ou menor contagem de escalas.`;
      }

      unallocatedMembers.push({
        memberId: member.id,
        memberName: member.name,
        role: memberRole,
        reason,
        availableCount: availableCultosSet.size
      });
    }
  }

  return {
    id: `scale_${month}_${Date.now()}`,
    month,
    status: 'em_elaboracao',
    generatedAt: new Date().toISOString(),
    publishedAt: null,
    participations: generatedParticipations,
    unallocatedMembers
  };
}
