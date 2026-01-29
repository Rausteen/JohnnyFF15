// Discord Webhook Service for game notifications

const WEBHOOK_STORAGE_KEY = 'johnny_discord_webhook_url';

// Get webhook URL from localStorage or env
function getWebhookUrl(): string {
  const storedUrl = localStorage.getItem(WEBHOOK_STORAGE_KEY);
  if (storedUrl) return storedUrl;
  return import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';
}

// Set webhook URL in localStorage
export function setWebhookUrl(url: string): void {
  if (url) {
    localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
  } else {
    localStorage.removeItem(WEBHOOK_STORAGE_KEY);
  }
}

// Get current webhook URL (for display)
export function getStoredWebhookUrl(): string {
  return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
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
  GREEN: 0x22c55e,  // Game started - bets open
  RED: 0xef4444,    // Game ended
  GOLD: 0xf59e0b,   // Warning
  PURPLE: 0xa855f7, // Test
};

// Track last notification to avoid duplicates
let lastNotifiedGameId: number | null = null;
let lastEndedGameIds: Set<string> = new Set(); // Track ended games per player to avoid duplicates

// Helper to get champion image URL
function getChampionImageUrl(championName: string): string {
  // Normalize champion name for URL (remove spaces, handle special cases)
  const normalizedName = championName
    .replace(/['\s]/g, '') // Remove apostrophes and spaces
    .replace(/\./g, ''); // Remove dots (e.g., "K'Sante" -> "KSante", "Bel'Veth" -> "BelVeth")
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${normalizedName}.png`;
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
      title: `🎰 ${playerName.toUpperCase()} EST EN GAME ! (TEST)`,
      description: `Les paris sont ouverts pendant **3 minutes** !\n\n**Viens parier sur le feed de ${playerName} !**\n\n⚠️ *Ceci est un test, ${playerName} n'est pas vraiment en game*`,
      color: COLORS.PURPLE,
      fields: [
        {
          name: '🎮 Mode de jeu',
          value: gameMode,
          inline: true,
        },
        {
          name: '🏆 Champion',
          value: championName,
          inline: true,
        },
        {
          name: '⏱️ Temps restant',
          value: '3 minutes pour parier',
          inline: true,
        },
        {
          name: '🔗 Parier maintenant',
          value: `[Ouvrir JohnnyFF15](${siteUrl})`,
          inline: false,
        },
      ],
      thumbnail: {
        url: 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png',
      },
      footer: {
        text: 'JohnnyFF15 - Message de test',
      },
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

  // Handle single player or multiple players
  const players = Array.isArray(playerNames) ? playerNames : [playerNames];
  const champions = Array.isArray(championNames) ? championNames : (championNames ? [championNames] : []);
  const playersList = players.join(' et ');
  const playersUpper = players.map(p => p.toUpperCase()).join(' & ');
  const isMultiplePlayers = players.length > 1;

  // Build player + champion display
  const playersWithChamps = players.map((p, i) => {
    const champ = champions[i];
    return champ ? `${p} (${champ})` : p;
  }).join(', ');

  // Build fields array
  const fields = [
    {
      name: '🎮 Mode de jeu',
      value: gameMode || 'Ranked Solo/Duo',
      inline: true,
    },
    {
      name: '👥 Joueurs',
      value: playersWithChamps,
      inline: true,
    },
  ];

  // Add champion field only if we have champion names
  if (champions.length > 0) {
    fields.push({
      name: '🏆 Champion' + (champions.length > 1 ? 's' : ''),
      value: champions.join(', '),
      inline: true,
    });
  }

  fields.push(
    {
      name: '⏱️ Temps restant',
      value: '3 minutes pour parier',
      inline: true,
    },
    {
      name: '🔗 Parier maintenant',
      value: `[Ouvrir JohnnyFF15](${siteUrl})`,
      inline: false,
    }
  );

  // Use the first champion's image as thumbnail (or default icon if no champion)
  const thumbnailUrl = champions.length > 0
    ? getChampionImageUrl(champions[0])
    : 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/4644.png';

  return sendDiscordNotification({
    content: '<@&1466416446094442578>',  // Ping role JohnnyFF15
    embeds: [{
      title: isMultiplePlayers
        ? `🎰 ${playersUpper} SONT EN GAME ENSEMBLE !`
        : `🎰 ${playersUpper} EST EN GAME !`,
      description: isMultiplePlayers
        ? `Les paris sont ouverts pendant **3 minutes** !\n\n**${playersList} jouent ensemble ! Viens parier sur leurs feeds !**`
        : `Les paris sont ouverts pendant **3 minutes** !\n\n**Viens parier sur le feed de ${playersList} !**`,
      color: COLORS.GREEN,
      fields,
      thumbnail: {
        url: thumbnailUrl,
      },
      footer: {
        text: 'JohnnyFF15 - Le casino du feed',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function notifyBettingClosed(gameId: number): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  return sendDiscordNotification({
    embeds: [{
      title: '🔒 Paris fermés',
      description: `La fenêtre de paris est terminée.\nLa game est en cours, résultats bientôt !`,
      color: COLORS.GOLD,
      footer: {
        text: 'JohnnyFF15',
      },
    }],
  });
}

export async function notifyGameEnded(won: boolean, kills: number, deaths: number, assists: number, championName: string, playerName: string = 'Johnny', matchId?: string): Promise<boolean> {
  // Avoid duplicate notifications for the same game end
  const dedupeKey = `${playerName}_${matchId || `${championName}_${kills}_${deaths}_${assists}`}`;
  if (lastEndedGameIds.has(dedupeKey)) {
    console.log(`Skipping duplicate end-game notification for ${playerName}`);
    return false;
  }
  lastEndedGameIds.add(dedupeKey);

  // Clean up old entries after 5 minutes
  setTimeout(() => lastEndedGameIds.delete(dedupeKey), 5 * 60 * 1000);

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.fr/#/dashboard';

  return sendDiscordNotification({
    embeds: [{
      title: won ? '✅ VICTOIRE (comment ?!)' : '💀 DÉFAITE (comme prévu)',
      description: `${playerName} a terminé sa game sur **${championName}**`,
      color: won ? COLORS.GREEN : COLORS.RED,
      fields: [
        {
          name: '📊 Score',
          value: `**${kills}/${deaths}/${assists}**`,
          inline: true,
        },
        {
          name: '💀 Feed level',
          value: deaths >= 10 ? 'LEGENDARY INTER' : deaths >= 7 ? 'Super Inter' : deaths >= 5 ? 'Inter classique' : 'Pas mal',
          inline: true,
        },
        {
          name: '🔗 Voir les résultats',
          value: `[Ouvrir JohnnyFF15](${siteUrl})`,
          inline: false,
        },
      ],
      thumbnail: {
        url: getChampionImageUrl(championName),
      },
      footer: {
        text: 'JohnnyFF15 - Les paris sont résolus !',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

// Reset the last notified game (useful for testing)
export function resetLastNotifiedGame(): void {
  lastNotifiedGameId = null;
}
