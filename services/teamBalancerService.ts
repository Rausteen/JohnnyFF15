// Team Balancer Service - Generates balanced 5v5 teams
import {
  PlayerWithSkill,
  PlayerRole,
  ROLES,
  BalancedTeam,
  BalancedTeamsResult
} from '../types';

interface PlayerRoleAssignment {
  player: PlayerWithSkill;
  assignedRole: PlayerRole;
  rolePreference: number; // 0 = primary, 1 = secondary, 2 = fill
}

/**
 * Balance 10 players into 2 teams
 * Goals:
 * 1. Equalize total skill rating between teams
 * 2. Respect role preferences as much as possible
 * 3. Avoid role conflicts within a team
 */
export function balanceTeams(players: PlayerWithSkill[]): BalancedTeamsResult {
  if (players.length !== 10) {
    throw new Error('Exactly 10 players are required for team balancing');
  }

  // Generate multiple team compositions and pick the best one
  const NUM_ATTEMPTS = 100;
  let bestResult: BalancedTeamsResult | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < NUM_ATTEMPTS; i++) {
    const result = tryBalanceTeams(players);
    const score = evaluateBalance(result);

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult!;
}

/**
 * Attempt to balance teams with some randomization
 */
function tryBalanceTeams(players: PlayerWithSkill[]): BalancedTeamsResult {
  // Sort by skill with randomization for players with similar skill levels
  // Add random factor of ±5 to skill for sorting, creating variation between attempts
  const sorted = [...players].sort((a, b) => {
    const aSkill = a.skillRating.odverall + (Math.random() - 0.5) * 10;
    const bSkill = b.skillRating.odverall + (Math.random() - 0.5) * 10;
    return bSkill - aSkill;
  });

  // Snake draft: alternate picks between teams
  // 1-2-2-2-2-1 pattern for fairness
  const team1Players: PlayerWithSkill[] = [];
  const team2Players: PlayerWithSkill[] = [];

  sorted.forEach((player, index) => {
    // Snake draft pattern
    const round = Math.floor(index / 2);
    const isTeam1Turn = (round % 2 === 0) ? (index % 2 === 0) : (index % 2 === 1);

    if (isTeam1Turn) {
      team1Players.push(player);
    } else {
      team2Players.push(player);
    }
  });

  // Assign roles to each team
  const team1 = assignRoles(team1Players);
  const team2 = assignRoles(team2Players);

  const team1Skill = team1.reduce((sum, p) => sum + p.player.skillRating.odverall, 0);
  const team2Skill = team2.reduce((sum, p) => sum + p.player.skillRating.odverall, 0);

  return {
    team1: {
      players: team1,
      totalSkill: team1Skill
    },
    team2: {
      players: team2,
      totalSkill: team2Skill
    },
    skillDifference: Math.abs(team1Skill - team2Skill)
  };
}

/**
 * Assign roles to 5 players, respecting preferences
 */
function assignRoles(players: PlayerWithSkill[]): PlayerRoleAssignment[] {
  const assignments: PlayerRoleAssignment[] = [];
  const usedRoles = new Set<PlayerRole>();
  const unassigned = [...players];

  // First pass: assign primary roles where possible
  for (const player of [...unassigned]) {
    const primaryRole = player.primaryRole;
    if (primaryRole && primaryRole !== 'FILL' && !usedRoles.has(primaryRole)) {
      usedRoles.add(primaryRole);
      assignments.push({
        player,
        assignedRole: primaryRole,
        rolePreference: 0
      });
      unassigned.splice(unassigned.indexOf(player), 1);
    }
  }

  // Second pass: assign secondary roles
  for (const player of [...unassigned]) {
    const secondaryRole = player.secondaryRole;
    if (secondaryRole && secondaryRole !== 'FILL' && !usedRoles.has(secondaryRole)) {
      usedRoles.add(secondaryRole);
      assignments.push({
        player,
        assignedRole: secondaryRole,
        rolePreference: 1
      });
      unassigned.splice(unassigned.indexOf(player), 1);
    }
  }

  // Third pass: fill remaining roles
  const availableRoles = ROLES.filter(r => !usedRoles.has(r));

  for (const player of unassigned) {
    const role = availableRoles.shift()!;
    usedRoles.add(role);
    assignments.push({
      player,
      assignedRole: role,
      rolePreference: 2
    });
  }

  // Sort by role order: TOP, JG, MID, ADC, SUP
  const roleOrder: Record<PlayerRole, number> = {
    TOP: 0,
    JUNGLE: 1,
    MID: 2,
    ADC: 3,
    SUPPORT: 4,
    FILL: 5
  };

  return assignments.sort((a, b) => roleOrder[a.assignedRole] - roleOrder[b.assignedRole]);
}

/**
 * Evaluate how good a team balance is (higher = better)
 */
function evaluateBalance(result: BalancedTeamsResult): number {
  let score = 0;

  // Lower skill difference is better (inverted, max 100 points)
  const skillPenalty = result.skillDifference * 2;
  score += Math.max(0, 100 - skillPenalty);

  // Reward role preference satisfaction
  const allAssignments = [...result.team1.players, ...result.team2.players];

  for (const assignment of allAssignments) {
    if (assignment.rolePreference === 0) {
      score += 10; // Primary role = +10
    } else if (assignment.rolePreference === 1) {
      score += 5; // Secondary role = +5
    }
    // Fill = +0
  }

  return score;
}

/**
 * Quick balance - simpler algorithm for testing
 */
export function quickBalance(players: PlayerWithSkill[]): BalancedTeamsResult {
  if (players.length !== 10) {
    throw new Error('Exactly 10 players are required');
  }

  // Sort by skill descending
  const sorted = [...players].sort((a, b) => b.skillRating.odverall - a.skillRating.odverall);

  // Greedy assignment: put each player in the team with lower total skill
  const team1Players: PlayerWithSkill[] = [];
  const team2Players: PlayerWithSkill[] = [];
  let team1Skill = 0;
  let team2Skill = 0;

  for (const player of sorted) {
    // Also check if team is full
    const team1Full = team1Players.length >= 5;
    const team2Full = team2Players.length >= 5;

    if (team1Full) {
      team2Players.push(player);
      team2Skill += player.skillRating.odverall;
    } else if (team2Full) {
      team1Players.push(player);
      team1Skill += player.skillRating.odverall;
    } else if (team1Skill <= team2Skill) {
      team1Players.push(player);
      team1Skill += player.skillRating.odverall;
    } else {
      team2Players.push(player);
      team2Skill += player.skillRating.odverall;
    }
  }

  // Assign roles
  const team1 = assignRoles(team1Players);
  const team2 = assignRoles(team2Players);

  return {
    team1: {
      players: team1,
      totalSkill: team1Skill
    },
    team2: {
      players: team2,
      totalSkill: team2Skill
    },
    skillDifference: Math.abs(team1Skill - team2Skill)
  };
}
