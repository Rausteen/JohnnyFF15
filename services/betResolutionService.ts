// Service to resolve bets based on actual match data from Riot API
// Uses Supabase for all bets (ALL users, not just current user)
import { MatchDto, MatchParticipant } from './riotApi';
import { Bet, BetStatus } from '../types';
import { getAllPendingBets, updateBetStatus } from './betsService';
import { supabase } from './supabase';

export interface BetResolutionResult {
  betId: string;
  propId: string;
  won: boolean;
  payout: number;
  resolvedStat?: string;
}

// Get the actual stat string that explains the bet result
export function getResolvedStat(propId: string, stats: MatchParticipant, match: MatchDto): string {
  const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  const csPerMin = (stats.totalMinionsKilled + stats.neutralMinionsKilled) / (match.info.gameDuration / 60);
  const gameDurationMin = Math.floor(match.info.gameDuration / 60);

  // Get Johnny's team kills for kill participation
  const team = match.info.participants.filter(p => p.teamId === stats.teamId);
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const killParticipation = teamKills > 0 ? (stats.kills + stats.assists) / teamKills * 100 : 0;

  // Get lowest teammate gold
  const teammates = match.info.participants.filter(p => p.teamId === stats.teamId && p.puuid !== stats.puuid);
  const lowestTeammateGold = teammates.length > 0 ? Math.min(...teammates.map(p => p.goldEarned)) : 0;

  // Handle Dragon Score bets (format: dragon_score_X_Y)
  if (propId.startsWith('dragon_score_')) {
    const playerTeam = match.info.teams.find(t => t.teamId === stats.teamId);
    const enemyTeam = match.info.teams.find(t => t.teamId !== stats.teamId);
    const teamDragons = playerTeam?.objectives.dragon.kills || 0;
    const enemyDragons = enemyTeam?.objectives.dragon.kills || 0;
    return `🐉 Dragons: ${teamDragons} - ${enemyDragons}`;
  }

  // Handle Exact KDA bets (format: exact_kda_K_D_A)
  if (propId.startsWith('exact_kda_')) {
    return `🎯 K/D/A: ${stats.kills}/${stats.deaths}/${stats.assists}`;
  }

  // Handle Exact Damage bets (format: exact_damage_Xk)
  if (propId.startsWith('exact_damage_')) {
    const damageK = Math.floor(stats.totalDamageDealtToChampions / 1000);
    return `⚔️ Dégâts: ${damageK}k`;
  }

  switch (propId) {
    // ========== EARLY GAME ==========
    case 'early1': // First Blood victime
      return stats.firstBloodVictim ? '🩸 First Blood victime' : '✓ Pas First Blood victime';
    case 'early5': // First Blood kill
      return stats.firstBloodKill ? '🗡️ First Blood kill' : '✗ Pas First Blood';
    case 'early3': // 5 morts ou plus
      return `${stats.deaths} morts`;
    case 'early6': // 4 morts ou moins
      return `${stats.deaths} morts`;
    case 'early4': // 0 mort toute la game
      return `${stats.deaths} morts`;

    // ========== KDA ==========
    case 'kda1': // Le 0/10 Powerspike
      return `${stats.deaths} morts`;
    case 'kda2': // Le 0/15 Légendaire
      return `${stats.deaths} morts`;
    case 'kda3': // KDA < 0.5
      return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda4': // 0 Kill toute la game
      return `${stats.kills} kills`;
    case 'kda5': // 0 Assist toute la game
      return `${stats.assists} assists`;
    case 'kda6': // KDA >= 1
      return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda9': // KDA >= 2
      return `KDA: ${kda.toFixed(2)} (${stats.kills}/${stats.deaths}/${stats.assists})`;
    case 'kda7': // Double kill ou plus
      return `${stats.doubleKills} double kills`;
    case 'kda8': // Triple kill ou plus
      return `${stats.tripleKills} triple kills`;

    // ========== SOLO KILLS ==========
    case 'sk1': // 3 Solo Kills ou plus
      return `${stats.challenges?.soloKills || 0} solo kills`;
    case 'sk2': // 5 Solo Kills ou plus
      return `${stats.challenges?.soloKills || 0} solo kills`;
    case 'sk3': // 0 Solo Kill
      return `${stats.challenges?.soloKills || 0} solo kills`;

    // ========== SOLO DEATHS (Timeline API) ==========
    case 'sd1': // 0 Solo Death
      return `${stats.soloDeaths || 0} solo deaths`;
    case 'sd2': // 3+ Solo Deaths
      return `${stats.soloDeaths || 0} solo deaths`;
    case 'sd3': // 5+ Solo Deaths
      return `${stats.soloDeaths || 0} solo deaths`;

    // ========== GAMEPLAY ==========
    case 'gp1': // CS de la honte
      return `${csPerMin.toFixed(1)} CS/min`;
    case 'gp7': // CS > 9.5/min
      return `${csPerMin.toFixed(1)} CS/min`;
    case 'gp2': // 0 Vision Score (legacy)
      return `Vision: ${stats.visionScore}`;
    case 'gp3': // Vision < 5 (legacy)
      return `Vision: ${stats.visionScore}`;
    case 'gp4': // Moins de 8k dégâts
      return `${(stats.totalDamageDealtToChampions / 1000).toFixed(1)}k dégâts`;
    case 'gp5': // Moins d'or que le support
      return `${stats.goldEarned} or (min équipe: ${lowestTeammateGold})`;
    case 'gp6': // Participation < 15%
      return `${killParticipation.toFixed(0)}% KP`;

    // ========== RÉSULTAT ==========
    case 'out1': // FF avant 20 min
      return `${stats.gameEndedInSurrender ? 'FF' : 'Pas FF'} à ${gameDurationMin}min`;
    case 'out2': // Défaite
      return stats.win ? 'Victoire' : 'Défaite';
    case 'out3': // VICTOIRE
      return stats.win ? 'Victoire' : 'Défaite';
    case 'out4': // Game > 40 min
      return `Durée: ${gameDurationMin}min`;

    // ========== LÉGENDAIRES ==========
    case 'sp1': // Le Perfect Int
      return `${stats.deaths} morts, ${stats.kills} kills, ${stats.win ? 'Win' : 'Défaite'}`;
    case 'sp2': // Le Miracle KDA
      return `KDA: ${kda.toFixed(2)}`;
    case 'sp3': // Le Carry Mystique
      const maxTeamDamage = Math.max(...team.map(p => p.totalDamageDealtToChampions));
      return `${(stats.totalDamageDealtToChampions / 1000).toFixed(1)}k dmg (max: ${(maxTeamDamage / 1000).toFixed(1)}k)`;
    case 'sp6': // Le Pentakill
      return `${stats.pentaKills} pentakill${stats.pentaKills > 1 ? 's' : ''}`;

    default:
      return `${stats.kills}/${stats.deaths}/${stats.assists}`;
  }
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

  // Handle Dragon Score bets (format: dragon_score_X_Y)
  if (propId.startsWith('dragon_score_')) {
    const parts = propId.split('_');
    const predictedTeam = parseInt(parts[2], 10);
    const predictedEnemy = parseInt(parts[3], 10);

    const playerTeam = match.info.teams.find(t => t.teamId === stats.teamId);
    const enemyTeam = match.info.teams.find(t => t.teamId !== stats.teamId);
    const actualTeam = playerTeam?.objectives.dragon.kills || 0;
    const actualEnemy = enemyTeam?.objectives.dragon.kills || 0;

    return predictedTeam === actualTeam && predictedEnemy === actualEnemy;
  }

  // Handle Exact KDA bets (format: exact_kda_K_D_A)
  if (propId.startsWith('exact_kda_')) {
    const parts = propId.replace('exact_kda_', '').split('_');
    const predictedKills = parseInt(parts[0], 10);
    const predictedDeaths = parseInt(parts[1], 10);
    const predictedAssists = parseInt(parts[2], 10);

    return stats.kills === predictedKills &&
           stats.deaths === predictedDeaths &&
           stats.assists === predictedAssists;
  }

  // Handle Exact Damage bets (format: exact_damage_Xk or exact_damage_40k+)
  if (propId.startsWith('exact_damage_')) {
    const damageStr = propId.replace('exact_damage_', '');
    const actualK = Math.floor(stats.totalDamageDealtToChampions / 1000);

    // Handle 40k+ case
    if (damageStr === '40k+') {
      return actualK >= 40;
    }

    const predictedK = parseInt(damageStr.replace('k', ''), 10);
    // Win if damage is within the 1k range (e.g., 12k means 12000-12999)
    return actualK === predictedK;
  }

  switch (propId) {
    // ========== EARLY GAME ==========
    case 'early1': // First Blood victime
      return stats.firstBloodVictim === true;

    case 'early5': // First Blood kill
      return stats.firstBloodKill === true;

    case 'early3': // 5 morts ou plus
      return stats.deaths >= 5;

    case 'early6': // 4 morts ou moins
      return stats.deaths <= 4;

    case 'early4': // 0 mort toute la game
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

    case 'kda5': // 0 Assist toute la game
      return stats.assists === 0;

    case 'kda6': // KDA >= 1
      return kda >= 1.0;

    case 'kda9': // KDA >= 2
      return kda >= 2.0;

    case 'kda7': // Double kill ou plus
      return stats.doubleKills >= 1;

    case 'kda8': // Triple kill ou plus
      return stats.tripleKills >= 1;

    // ========== SOLO KILLS ==========
    case 'sk1': // 3 Solo Kills ou plus
      return (stats.challenges?.soloKills || 0) >= 3;

    case 'sk2': // 5 Solo Kills ou plus
      return (stats.challenges?.soloKills || 0) >= 5;

    case 'sk3': // 0 Solo Kill
      return (stats.challenges?.soloKills || 0) === 0;

    // ========== SOLO DEATHS (Timeline API) ==========
    case 'sd1': // 0 Solo Death
      return (stats.soloDeaths || 0) === 0;

    case 'sd2': // 3+ Solo Deaths
      return (stats.soloDeaths || 0) >= 3;

    case 'sd3': // 5+ Solo Deaths
      return (stats.soloDeaths || 0) >= 5;

    // ========== GAMEPLAY ==========
    case 'gp1': // CS de la honte (<4/min)
      return csPerMin < 4;

    case 'gp7': // CS > 9.5/min
      return csPerMin > 9.5;

    case 'gp2': // 0 Vision Score (legacy)
      return stats.visionScore === 0;

    case 'gp3': // Vision < 5 (legacy)
      return stats.visionScore < 5;

    case 'gp4': // Moins de 8k dégâts
      return stats.totalDamageDealtToChampions < 8000;

    case 'gp5': // Moins d'or que le support
      return stats.goldEarned < lowestTeammateGold;

    case 'gp6': // Participation < 25%
      return killParticipation < 25;

    // ========== RÉSULTAT ==========
    case 'out1': // FF avant 20 min (any surrender before 20 min)
      return stats.gameEndedInSurrender && match.info.gameDuration < 1200;

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

    case 'sp6': // Le Pentakill
      return stats.pentaKills >= 1;

    default:
      console.warn(`Unknown prop ID: ${propId}`);
      return false;
  }
}

// Update user credits in Supabase using RPC function (bypasses RLS)
async function updateUserCredits(userId: string, won: boolean, amount: number, payout: number): Promise<void> {
  try {
    console.log(`Updating credits for user ${userId.slice(0, 8)}...: won=${won}, amount=${amount}, payout=${payout}`);

    // Use the RPC function that bypasses RLS
    const { data, error } = await supabase.rpc('update_user_credits_on_bet_resolution', {
      p_user_id: userId,
      p_won: won,
      p_amount: amount,
      p_payout: payout
    });

    if (error) {
      console.error('Error calling update_user_credits_on_bet_resolution:', error);

      // Fallback: try direct update (might work if RLS allows it)
      console.log('Trying direct update as fallback...');
      await updateUserCreditsDirect(userId, won, amount, payout);
      return;
    }

    console.log(`Credits updated successfully for user ${userId.slice(0, 8)}...`);
  } catch (err) {
    console.error('Error updating user credits:', err);
  }
}

// Direct update (fallback if RPC function not available)
async function updateUserCreditsDirect(userId: string, won: boolean, amount: number, payout: number): Promise<void> {
  try {
    // Fetch current user stats
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('credits, bets_won, bets_lost, jc_won, jc_lost')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      console.error('Error fetching user profile:', fetchError);
      return;
    }

    if (won) {
      // Add winnings to credits and update stats
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credits: profile.credits + payout,
          bets_won: (profile.bets_won || 0) + 1,
          jc_won: (profile.jc_won || 0) + (payout - amount)
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user credits (win):', updateError);
      } else {
        console.log(`Direct update successful: +${payout} credits for user ${userId.slice(0, 8)}...`);
      }
    } else {
      // Update loss stats (credits already deducted when bet was placed)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          bets_lost: (profile.bets_lost || 0) + 1,
          jc_lost: (profile.jc_lost || 0) + amount
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user stats (loss):', updateError);
      } else {
        console.log(`Direct update successful: loss stats updated for user ${userId.slice(0, 8)}...`);
      }
    }
  } catch (err) {
    console.error('Error in direct credits update:', err);
  }
}

// Resolve all pending bets for a specific match
// This function resolves pending bets from ALL users in Supabase
// If expectedMatchId is provided, only bets for that match are resolved
export async function resolveBets(matchData: MatchDto, playerPuuid: string, playerName?: string, expectedMatchId?: string): Promise<BetResolutionResult[]> {
  const results: BetResolutionResult[] = [];
  const matchId = matchData.metadata.matchId;

  // Get the player's stats from the match
  const playerStats = matchData.info.participants.find(p => p.puuid === playerPuuid);
  if (!playerStats) {
    console.error(`Could not find player ${playerName || playerPuuid} in match participants`);
    return results;
  }

  // Get ALL pending bets from Supabase (all users)
  let pendingBets = await getAllPendingBets();

  if (pendingBets.length === 0) {
    console.log('No pending bets to resolve');
    return results;
  }

  // Filter bets by matchId if expectedMatchId is provided
  if (expectedMatchId) {
    const totalBets = pendingBets.length;
    pendingBets = pendingBets.filter(bet => bet.matchId === expectedMatchId);
    console.log(`Filtered bets by matchId ${expectedMatchId}: ${pendingBets.length}/${totalBets} bets match`);

    if (pendingBets.length === 0) {
      console.log('No bets found for this specific match');
      return results;
    }
  }

  // Filter bets by player if playerPuuid is set on bets
  // This ensures we only resolve bets for the specific player who finished their game
  const betsForThisPlayer = pendingBets.filter(bet => !bet.playerPuuid || bet.playerPuuid === playerPuuid);
  if (betsForThisPlayer.length < pendingBets.length) {
    console.log(`Filtered bets by player: ${betsForThisPlayer.length}/${pendingBets.length} bets are for ${playerName || 'this player'}`);
    pendingBets = betsForThisPlayer;
  }

  console.log(`Match data: ${matchId}, ${playerName || 'Player'} KDA: ${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}`);
  console.log(`Resolving ${pendingBets.length} pending bets...`);

  // Separate single bets from combo bets
  const singleBets = pendingBets.filter(b => !b.comboId);
  const comboBets = pendingBets.filter(b => b.comboId);

  // Group combo bets by comboId
  const comboGroups = new Map<string, Bet[]>();
  for (const bet of comboBets) {
    const existing = comboGroups.get(bet.comboId!) || [];
    existing.push(bet);
    comboGroups.set(bet.comboId!, existing);
  }

  // Process single bets
  for (const bet of singleBets) {
    const won = evaluateProp(bet.propId, playerStats, matchData);
    const resolvedStat = getResolvedStat(bet.propId, playerStats, matchData);

    // Update bet status in Supabase
    const success = await updateBetStatus(bet.id, won ? BetStatus.WON : BetStatus.LOST, resolvedStat);

    if (success) {
      // Update user's credits in Supabase
      if (bet.userId) {
        await updateUserCredits(bet.userId, won, bet.amount, bet.potentialPayout);
      }

      results.push({
        betId: bet.id,
        propId: bet.propId,
        won,
        payout: won ? bet.potentialPayout : 0,
        resolvedStat
      });

      console.log(`Single bet ${bet.propTitle} (user: ${bet.userId?.slice(0, 8)}...): ${won ? 'WON' : 'LOST'} (${resolvedStat})`);
    }
  }

  // Process combo bets - ALL bets in combo must win for payout
  for (const [comboId, bets] of comboGroups) {
    console.log(`Processing combo ${comboId} with ${bets.length} bets`);

    // Evaluate each bet in the combo
    const betResults = bets.map(bet => ({
      bet,
      won: evaluateProp(bet.propId, playerStats, matchData),
      resolvedStat: getResolvedStat(bet.propId, playerStats, matchData)
    }));

    // Combo wins only if ALL bets won
    const comboWon = betResults.every(r => r.won);
    console.log(`Combo ${comboId} results:`, betResults.map(r => `${r.bet.propId}: ${r.won}`), `=> Combo ${comboWon ? 'WON' : 'LOST'}`);

    // Find the bet with the amount (first bet in combo)
    const mainBet = bets.find(b => b.amount > 0) || bets[0];
    const totalAmount = mainBet.amount;
    const potentialPayout = mainBet.potentialPayout;

    // Update all bets in the combo in Supabase
    for (const { bet, resolvedStat } of betResults) {
      const success = await updateBetStatus(bet.id, comboWon ? BetStatus.WON : BetStatus.LOST, resolvedStat);

      if (success) {
        results.push({
          betId: bet.id,
          propId: bet.propId,
          won: comboWon,
          payout: 0, // Only main bet shows payout
          resolvedStat
        });
      }
    }

    // Update user credits for the combo (only once per combo)
    if (mainBet.userId) {
      await updateUserCredits(mainBet.userId, comboWon, totalAmount, potentialPayout);
    }

    if (comboWon) {
      console.log(`Combo ${comboId} WON! Payout: ${potentialPayout} JC to user ${mainBet.userId?.slice(0, 8)}...`);
    } else {
      console.log(`Combo ${comboId} LOST. Lost: ${totalAmount} JC from user ${mainBet.userId?.slice(0, 8)}...`);
    }

    // Update main bet payout in results
    const mainBetResult = results.find(r => r.betId === mainBet.id);
    if (mainBetResult) {
      mainBetResult.payout = comboWon ? potentialPayout : 0;
    }
  }

  console.log(`Resolution complete: ${results.filter(r => r.won).length} won, ${results.filter(r => !r.won).length} lost`);

  return results;
}
