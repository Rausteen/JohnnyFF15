// Discord Webhook Service for game notifications

// Get webhook URL from env
function getWebhookUrl(): string {
  return import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

// Colors for Discord embeds
const COLORS = {
  GREEN: 0x22c55e,  // Victory / Game started
  RED: 0xef4444,    // Defeat / Game ended
  GOLD: 0xf59e0b,   // Warning / Rank up
  PURPLE: 0xa855f7, // Test
  CYAN: 0x06b6d4,   // Info / Stats
  BLUE: 0x3b82f6,   // Rank change
};

// Track last notification to avoid duplicates
let lastNotifiedGameId: number | null = null;
let lastEndedGameIds: Set<string> = new Set(); // Track ended games per player to avoid duplicates

// Helper to get champion image URL
function getChampionImageUrl(championName: string): string {
  const normalizedName = championName
    .replace(/['\s]/g, '')
    .replace(/\./g, '');
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${normalizedName}.png`;
}

// Rank tier labels in French
const RANK_LABELS: Record<string, string> = {
  IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or',
  PLATINUM: 'Platine', EMERALD: 'Emeraude', DIAMOND: 'Diamant',
  MASTER: 'Master', GRANDMASTER: 'GrandMaster', CHALLENGER: 'Challenger'
};

// Rank tier order for comparison
const RANK_ORDER: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9
};

const DIVISION_ORDER: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };

// Helper to calculate KDA ratio
function getKDARatio(kills: number, deaths: number, assists: number): string {
  const ratio = (kills + assists) / Math.max(1, deaths);
  return ratio.toFixed(2);
}

// Helper to format game duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function sendDiscordNotification(message: DiscordMessage): Promise<boolean> {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'JohnnyFF15 Bot',
        avatar_url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
        ...message,
      }),
    });

    if (!response.ok) {
      console.error('Discord webhook error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

// Send a test notification
export async function sendTestNotification(championName: string = 'Yasuo', gameMode: string = 'Ranked Solo/Duo', playerName: string = 'Johnny'): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  return sendDiscordNotification({
    content: '🧪 **TEST** - Ceci est un message de test',
    embeds: [{
      title: `🎮 ${playerName.toUpperCase()} EST EN GAME ! (TEST)`,
      description: `**${playerName}** vient de lancer une game !\n\n⚠️ *Ceci est un test, ${playerName} n'est pas vraiment en game*`,
      color: COLORS.PURPLE,
      fields: [
        { name: '🎮 Mode de jeu', value: gameMode, inline: true },
        { name: '🏆 Champion', value: championName, inline: true },
        { name: '🔗 Voir sur le site', value: `[Ouvrir JohnnyFF15](${siteUrl})`, inline: false },
      ],
      thumbnail: {
        url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
      },
      footer: { text: 'JohnnyFF15 - Message de test' },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function notifyGameStarted(gameId: number, gameMode: string, playerNames: string | string[] = 'Johnny', championNames?: string | string[]): Promise<boolean> {
  // Avoid duplicate notifications for the same game
  if (lastNotifiedGameId === gameId) {
    return false;
  }
  lastNotifiedGameId = gameId;

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  const players = Array.isArray(playerNames) ? playerNames : [playerNames];
  const champions = Array.isArray(championNames) ? championNames : (championNames ? [championNames] : []);
  const playersList = players.join(' et ');
  const playersUpper = players.map(p => p.toUpperCase()).join(' & ');
  const isMultiplePlayers = players.length > 1;

  // Build player + champion display
  const playersWithChamps = players.map((p, i) => {
    const champ = champions[i];
    return champ ? `**${p}** (${champ})` : `**${p}**`;
  }).join(', ');

  const fields = [
    { name: '🎮 Mode', value: gameMode || 'Ranked Solo/Duo', inline: true },
    { name: '👥 Joueur' + (isMultiplePlayers ? 's' : ''), value: playersWithChamps, inline: true },
  ];

  if (champions.length > 0) {
    fields.push({
      name: '🏆 Champion' + (champions.length > 1 ? 's' : ''),
      value: champions.join(', '),
      inline: true,
    });
  }

  fields.push({
    name: '🔗 Voir la game',
    value: `[Ouvrir JohnnyFF15](${siteUrl})`,
    inline: false,
  });

  const thumbnailUrl = champions.length > 0
    ? getChampionImageUrl(champions[0])
    : 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png';

  return sendDiscordNotification({
    content: '<@&1466416446094442578>',
    embeds: [{
      title: isMultiplePlayers
        ? `🎮 ${playersUpper} SONT EN GAME ENSEMBLE !`
        : `🎮 ${playersUpper} EST EN GAME !`,
      description: isMultiplePlayers
        ? `${playersList} jouent ensemble !`
        : `${playersList} vient de lancer une game !`,
      color: COLORS.GREEN,
      fields,
      thumbnail: { url: thumbnailUrl },
      footer: { text: 'JohnnyFF15 - Squad Tracker' },
      timestamp: new Date().toISOString(),
    }],
  });
}

// Enhanced game ended notification with detailed stats
export async function notifyGameEnded(
  won: boolean,
  kills: number,
  deaths: number,
  assists: number,
  championName: string,
  playerName: string = 'Johnny',
  matchId?: string,
  extraStats?: {
    cs?: number;
    csPerMin?: number;
    damage?: number;
    vision?: number;
    gold?: number;
    gameDuration?: number;
    gameMode?: string;
    killParticipation?: number;
    rank?: string;
  }
): Promise<boolean> {
  const dedupeKey = `${playerName}_${matchId || `${championName}_${kills}_${deaths}_${assists}`}`;
  if (lastEndedGameIds.has(dedupeKey)) {
    console.log(`Skipping duplicate end-game notification for ${playerName}`);
    return false;
  }
  lastEndedGameIds.add(dedupeKey);
  setTimeout(() => lastEndedGameIds.delete(dedupeKey), 5 * 60 * 1000);

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';
  const kdaRatio = getKDARatio(kills, deaths, assists);

  // Performance rating
  let perfEmoji = '⭐';
  let perfText = 'Correct';
  const kdaNum = parseFloat(kdaRatio);
  if (kdaNum >= 5) { perfEmoji = '🔥'; perfText = 'Carry'; }
  else if (kdaNum >= 3) { perfEmoji = '✨'; perfText = 'Bien joué'; }
  else if (kdaNum >= 2) { perfEmoji = '👍'; perfText = 'Correct'; }
  else if (kdaNum >= 1) { perfEmoji = '😐'; perfText = 'Moyen'; }
  else { perfEmoji = '💀'; perfText = 'Catastrophe'; }

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: '📊 KDA', value: `**${kills}/${deaths}/${assists}** (${kdaRatio})`, inline: true },
    { name: `${perfEmoji} Performance`, value: perfText, inline: true },
  ];

  if (extraStats?.gameMode) {
    fields.push({ name: '🎮 Mode', value: extraStats.gameMode, inline: true });
  }

  if (extraStats?.gameDuration) {
    fields.push({ name: '⏱️ Durée', value: formatDuration(extraStats.gameDuration), inline: true });
  }

  if (extraStats?.cs !== undefined && extraStats?.csPerMin !== undefined) {
    fields.push({ name: '🗡️ CS', value: `${extraStats.cs} (${extraStats.csPerMin.toFixed(1)}/min)`, inline: true });
  }

  if (extraStats?.damage !== undefined) {
    const dmgFormatted = extraStats.damage >= 1000
      ? (extraStats.damage / 1000).toFixed(1) + 'k'
      : extraStats.damage.toString();
    fields.push({ name: '💥 Dégâts', value: dmgFormatted, inline: true });
  }

  if (extraStats?.vision !== undefined) {
    fields.push({ name: '👁️ Vision', value: extraStats.vision.toString(), inline: true });
  }

  if (extraStats?.killParticipation !== undefined) {
    fields.push({ name: '🤝 KP', value: `${Math.round(extraStats.killParticipation)}%`, inline: true });
  }

  if (extraStats?.rank) {
    fields.push({ name: '🏅 Rang', value: extraStats.rank, inline: true });
  }

  fields.push({
    name: '🔗 Voir les stats',
    value: `[Ouvrir JohnnyFF15](${siteUrl})`,
    inline: false,
  });

  return sendDiscordNotification({
    embeds: [{
      title: won ? `✅ VICTOIRE - ${playerName}` : `❌ DÉFAITE - ${playerName}`,
      description: `Game terminée sur **${championName}**`,
      color: won ? COLORS.GREEN : COLORS.RED,
      fields,
      thumbnail: { url: getChampionImageUrl(championName) },
      footer: { text: 'JohnnyFF15 - Squad Tracker' },
      timestamp: new Date().toISOString(),
    }],
  });
}

// Notify rank change
export async function notifyRankChange(
  playerName: string,
  oldTier: string | null,
  oldDivision: string | null,
  newTier: string,
  newDivision: string | null,
  newLp?: number
): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/player-stats';

  // Determine if it's a promotion or demotion
  const oldRankValue = oldTier ? (RANK_ORDER[oldTier] || 0) * 10 + (DIVISION_ORDER[oldDivision || 'IV'] || 0) : -1;
  const newRankValue = (RANK_ORDER[newTier] || 0) * 10 + (DIVISION_ORDER[newDivision || 'IV'] || 0);
  const isPromotion = newRankValue > oldRankValue;
  const isDemotion = newRankValue < oldRankValue;

  const oldRankLabel = oldTier ? `${RANK_LABELS[oldTier] || oldTier} ${oldDivision || ''}`.trim() : 'Unranked';
  const newRankLabel = `${RANK_LABELS[newTier] || newTier} ${newDivision || ''}`.trim();

  let title: string;
  let color: number;
  let emoji: string;

  if (isPromotion) {
    emoji = '📈';
    title = `${emoji} PROMOTION - ${playerName}`;
    color = COLORS.GREEN;
  } else if (isDemotion) {
    emoji = '📉';
    title = `${emoji} DEMOTION - ${playerName}`;
    color = COLORS.RED;
  } else {
    // Same tier change (shouldn't happen but handle it)
    emoji = '🔄';
    title = `${emoji} CHANGEMENT DE RANG - ${playerName}`;
    color = COLORS.BLUE;
  }

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: '📊 Ancien rang', value: oldRankLabel, inline: true },
    { name: isPromotion ? '🎉 Nouveau rang' : '💔 Nouveau rang', value: newRankLabel, inline: true },
  ];

  if (newLp !== undefined) {
    fields.push({ name: '🏅 LP', value: `${newLp} LP`, inline: true });
  }

  fields.push({
    name: '🔗 Voir le profil',
    value: `[Ouvrir JohnnyFF15](${siteUrl})`,
    inline: false,
  });

  return sendDiscordNotification({
    content: isPromotion ? '<@&1466416446094442578>' : undefined,
    embeds: [{
      title,
      description: isPromotion
        ? `**${playerName}** vient de monter en **${newRankLabel}** ! 🎉`
        : `**${playerName}** est passé de ${oldRankLabel} à **${newRankLabel}**`,
      color,
      fields,
      footer: { text: 'JohnnyFF15 - Squad Tracker' },
      timestamp: new Date().toISOString(),
    }],
  });
}

// Notify daily/weekly summary of tracked players
export async function notifySquadSummary(
  playersSummary: Array<{
    name: string;
    rank: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    avgKDA: string;
  }>
): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/player-stats';

  const fields = playersSummary.map(p => {
    const winRate = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
    const wrEmoji = winRate >= 50 ? '🟢' : '🔴';
    return {
      name: `${p.name} (${p.rank})`,
      value: `${p.gamesPlayed}G ${wrEmoji} ${winRate}% WR | KDA: ${p.avgKDA}`,
      inline: false,
    };
  });

  const totalGames = playersSummary.reduce((s, p) => s + p.gamesPlayed, 0);

  return sendDiscordNotification({
    embeds: [{
      title: '📋 RÉSUMÉ DU SQUAD',
      description: `Voici les stats des dernières 24h pour le squad (**${totalGames} games** au total)`,
      color: COLORS.CYAN,
      fields,
      footer: { text: 'JohnnyFF15 - Squad Tracker' },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function notifySeasonReset(userCount: number): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  return sendDiscordNotification({
    content: '<@&1466416446094442578>',
    embeds: [{
      title: '🔄 RESET DE SAISON',
      description: `**La saison a été reset !**\n\nTous les comptes ont été remis à zéro.\nC'est reparti de zéro pour tout le monde !`,
      color: COLORS.GOLD,
      fields: [
        { name: '👥 Joueurs reset', value: `${userCount}`, inline: true },
        { name: '💰 Crédits', value: '10 000 JC', inline: true },
        { name: '📊 Stats', value: 'Remises à zéro', inline: true },
        { name: '🎁 Cosmétiques', value: 'Tous supprimés', inline: true },
        { name: '🎰 Paris', value: 'Tous supprimés', inline: true },
        { name: '🔗 Rejouer maintenant', value: `[Ouvrir JohnnyFF15](${siteUrl})`, inline: false },
      ],
      footer: { text: 'JohnnyFF15 - Nouvelle saison !' },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function notifyRareDrop(playerName: string, itemName: string): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  return sendDiscordNotification({
    content: '<@&1466416446094442578>',
    embeds: [{
      title: '🏆 DROP RARE !',
      description: `**${playerName}** vient de drop **${itemName}** dans la Challenger Case !`,
      color: COLORS.GOLD,
      fields: [
        { name: '🎁 Lot', value: itemName, inline: true },
        { name: '👤 Joueur', value: playerName, inline: true },
        { name: '🔗 Tenter ta chance', value: `[Ouvrir JohnnyFF15](${siteUrl})`, inline: false },
      ],
      footer: { text: 'JohnnyFF15 - Challenger Case' },
      timestamp: new Date().toISOString(),
    }],
  });
}
