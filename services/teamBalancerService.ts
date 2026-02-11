// Team Balancer Service - Generates balanced teams (skill + role diversity)
import {
  PlayerWithSkill,
  BalancedTeamsResult
} from '../types';

/**
 * Balance players into 2 teams
 * - Minimum 2 players
 * - Odd numbers supported (one team gets +1)
 * - Considers both skill balance AND role diversity
 */
export function balanceTeams(players: PlayerWithSkill[]): BalancedTeamsResult {
  if (players.length < 2) {
    throw new Error('Il faut au moins 2 joueurs');
  }

  const NUM_ATTEMPTS = 200;
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
  const totalPlayers = players.length;
  const team1Size = Math.ceil(totalPlayers / 2);
  const team2Size = Math.floor(totalPlayers / 2);

  // Sort by skill with randomization for variation between attempts
  const sorted = [...players].sort((a, b) => {
    const aSkill = a.skillRating.odverall + (Math.random() - 0.5) * 15;
    const bSkill = b.skillRating.odverall + (Math.random() - 0.5) * 15;
    return bSkill - aSkill;
  });

  // Snake draft: alternate picks between teams
  const team1Players: PlayerWithSkill[] = [];
  const team2Players: PlayerWithSkill[] = [];

  sorted.forEach((player, index) => {
    const round = Math.floor(index / 2);
    const isTeam1Turn = (round % 2 === 0) ? (index % 2 === 0) : (index % 2 === 1);

    if (isTeam1Turn && team1Players.length < team1Size) {
      team1Players.push(player);
    } else if (!isTeam1Turn && team2Players.length < team2Size) {
      team2Players.push(player);
    } else if (team1Players.length < team1Size) {
      team1Players.push(player);
    } else {
      team2Players.push(player);
    }
  });

  const team1 = team1Players.map(p => ({ player: p }));
  const team2 = team2Players.map(p => ({ player: p }));

  const team1Skill = team1Players.reduce((sum, p) => sum + p.skillRating.odverall, 0);
  const team2Skill = team2Players.reduce((sum, p) => sum + p.skillRating.odverall, 0);

  return {
    team1: { players: team1, totalSkill: team1Skill },
    team2: { players: team2, totalSkill: team2Skill },
    skillDifference: Math.abs(team1Skill - team2Skill)
  };
}

/**
 * Count role duplicates in a team.
 * FILL players don't conflict with anyone.
 * Uses primaryRole only (secondaryRole is a fallback preference, not a conflict).
 */
function countRoleDuplicates(players: PlayerWithSkill[]): number {
  const roleCounts: Record<string, number> = {};
  for (const p of players) {
    const role = p.primaryRole;
    if (!role || role === 'FILL') continue;
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  // Each extra player beyond 1 on the same role is a duplicate
  let duplicates = 0;
  for (const count of Object.values(roleCounts)) {
    if (count > 1) duplicates += count - 1;
  }
  return duplicates;
}

/**
 * Evaluate how good a team balance is (higher = better)
 * Considers skill balance + role diversity on BOTH teams
 */
function evaluateBalance(result: BalancedTeamsResult): number {
  // Skill penalty: -2 per point of difference
  const skillPenalty = result.skillDifference * 2;

  // Role penalty: -15 per duplicate role per team
  const team1Players = result.team1.players.map(p => p.player);
  const team2Players = result.team2.players.map(p => p.player);
  const rolePenalty = (countRoleDuplicates(team1Players) + countRoleDuplicates(team2Players)) * 15;

  return Math.max(0, 100 - skillPenalty - rolePenalty);
}

/**
 * Quick balance - simpler greedy algorithm
 */
export function quickBalance(players: PlayerWithSkill[]): BalancedTeamsResult {
  if (players.length < 2) {
    throw new Error('Il faut au moins 2 joueurs');
  }

  const team1Size = Math.ceil(players.length / 2);
  const team2Size = Math.floor(players.length / 2);

  const sorted = [...players].sort((a, b) => b.skillRating.odverall - a.skillRating.odverall);

  const team1Players: PlayerWithSkill[] = [];
  const team2Players: PlayerWithSkill[] = [];
  let team1Skill = 0;
  let team2Skill = 0;

  for (const player of sorted) {
    const team1Full = team1Players.length >= team1Size;
    const team2Full = team2Players.length >= team2Size;

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

  return {
    team1: {
      players: team1Players.map(p => ({ player: p })),
      totalSkill: team1Skill
    },
    team2: {
      players: team2Players.map(p => ({ player: p })),
      totalSkill: team2Skill
    },
    skillDifference: Math.abs(team1Skill - team2Skill)
  };
}
