// Service to resolve bets based on actual match data from Riot API
import { MatchDto, MatchParticipant } from './riotApi';
import { Bet, BetStatus } from '../types';
import { useStore } from './store';
import { useCreditsStore } from './creditsStore';

export interface BetResolutionResult {
  betId: string;
  propId: string;
  won: boolean;
  payout: number;
}

// Evaluate if a prop condition was met based on match stats
export function evaluateProp(propId: string, stats: MatchParticipant, match: MatchDto): boolean {
  const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  const csPerMin = (stats.totalMinionsKilled + stats.neutralMinionsKilled) / (match.info.gameDuration / 60);

  // Get Johnny's team kills for kill participation
  const team = match.info.participants.filter(p => p.teamId === stats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const killParticipation = teamKills > 0 ? (stats.kills + stats.assists) / teamKills * 100 : 0;

  // Check if Johnny has less gold than support (teammate with support item)
  const teammates = match.info.participants.filter(p => p.teamId === stats.teamId && p.puuid !== stats.puuid);
  const lowestTeammateGold = teammates.length > 0 ? Math.min(...teammates.map(p => p.goldEarned)) : Infinity;

  switch (propId) {
    // ========== EARLY GAME ==========
    case 'early1': // First Blood victime
      return stats.firstBloodVictim === true;

    case 'early2': // 0/3 avant 10 min - Can't verify exact timing from post-game data
      // Approximation: if deaths >= 3 in a game that lasted at least 10 min, likely died early
      return stats.deaths >= 3;

    case 'early3': // 0/5 avant 15 min
      return stats.deaths >= 5;

    case 'early4': // Survit 10 min sans mourir - Can't verify exact timing
      // Approximation: no deaths in the game or very few
      return stats.deaths === 0;

    // ========== KDA ==========
    case 'kda1': // Le 0/10 Powerspike (10+ deaths)
      return stats.deaths >= 10;

    case 'kda2': // Le 0/15 Légendaire (15+ deaths)
      return stats.deaths >= 15;

    case 'kda3': // KDA < 0.5
      return kda < 0.5;

    case 'kda4': // 0 Kill toute la game
      return stats.kills === 0;

    case 'kda5': // Johnny fait un kill (at least 1)
      return stats.kills >= 1;

    case 'kda6': // KDA positif (≥1.0)
      return kda >= 1.0;

    case 'kda7': // Double kill ou plus
      return stats.doubleKills >= 1;

    // ========== GAMEPLAY ==========
    case 'gp1': // CS de la honte (<4/min)
      return csPerMin < 4;

    case 'gp2': // 0 Vision Score
      return stats.visionScore === 0;

    case 'gp3': // Vision < 5
      return stats.visionScore < 5;

    case 'gp4': // Moins de 8k dégâts
      return stats.totalDamageDealtToChampions < 8000;

    case 'gp5': // Moins d'or que le support
      return stats.goldEarned < lowestTeammateGold;

    case 'gp6': // Participation < 15%
      return killParticipation < 15;

    // ========== RÉSULTAT ==========
    case 'out1': // FF avant 20 min (early surrender = before 15 actually)
      return (stats.gameEndedInEarlySurrender || stats.teamEarlySurrendered) && match.info.gameDuration < 1200;

    case 'out2': // Défaite
      return !stats.win;

    case 'out3': // VICTOIRE
      return stats.win;

    case 'out4': // Game > 40 min
      return match.info.gameDuration > 2400;

    // ========== LÉGENDAIRES ==========
    case 'sp1': // Le Perfect Int (10+ morts, 0 kill, défaite)
      return stats.deaths >= 10 && stats.kills === 0 && !stats.win;

    case 'sp2': // Le Miracle KDA (KDA > 3.0)
      return kda > 3.0;

    case 'sp3': // Le Carry Mystique (top damage de l'équipe)
      const maxTeamDamage = Math.max(...team.map(p => p.totalDamageDealtToChampions));
      return stats.totalDamageDealtToChampions === maxTeamDamage;

    case 'sp4': // Victoire + KDA > 2
      return stats.win && kda > 2;

    case 'sp5': // L'Invisible (<5k dégâts + <10% KP)
      return stats.totalDamageDealtToChampions < 5000 && killParticipation < 10;

    case 'sp6': // Le Pentakill
      return stats.pentaKills >= 1;

    default:
      console.warn(`Unknown prop ID: ${propId}`);
      return false;
  }
}

// Resolve all pending bets for a specific match
export async function resolveBets(matchData: MatchDto, johnnyPuuid: string): Promise<BetResolutionResult[]> {
  const store = useStore.getState();
  const creditsStore = useCreditsStore.getState();
  const results: BetResolutionResult[] = [];

  const matchId = matchData.metadata.matchId;

  // Get Johnny's stats from the match
  const johnnyStats = matchData.info.participants.find(p => p.puuid === johnnyPuuid);
  if (!johnnyStats) {
    console.error('Could not find Johnny in match participants');
    return results;
  }

  // Get all pending bets for this match (or all pending bets if matchId not specified on bet)
  const pendingBets = store.bets.filter(b =>
    b.status === BetStatus.PENDING &&
    (b.matchId === matchId || !b.matchId || b.matchId.startsWith('m_')) // Support legacy bets without proper matchId
  );

  if (pendingBets.length === 0) {
    console.log('No pending bets to resolve for match:', matchId);
    return results;
  }

  console.log(`Resolving ${pendingBets.length} pending bets for match ${matchId}...`);

  // Evaluate each bet
  const updatedBets = [...store.bets];
  let totalWinnings = 0;

  for (const bet of pendingBets) {
    const won = evaluateProp(bet.propId, johnnyStats, matchData);
    const betIndex = updatedBets.findIndex(b => b.id === bet.id);

    if (betIndex !== -1) {
      updatedBets[betIndex] = {
        ...updatedBets[betIndex],
        status: won ? BetStatus.WON : BetStatus.LOST
      };

      if (won) {
        totalWinnings += bet.potentialPayout;
        // Record bet won in credits store
        await creditsStore.recordBetWon(bet.potentialPayout - bet.amount);
      } else {
        // Record bet lost
        await creditsStore.recordBetLost(bet.amount);
      }

      results.push({
        betId: bet.id,
        propId: bet.propId,
        won,
        payout: won ? bet.potentialPayout : 0
      });

      console.log(`Bet ${bet.propTitle}: ${won ? 'WON' : 'LOST'}`);
    }
  }

  // Update store with resolved bets
  useStore.setState({ bets: updatedBets });

  // Add winnings to user's credits
  if (totalWinnings > 0) {
    await creditsStore.addCredits(totalWinnings);
    console.log(`Total winnings: ${totalWinnings} JC`);
  }

  return results;
}
