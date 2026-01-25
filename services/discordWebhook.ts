// Discord Webhook Service for game notifications

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || '';

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
};

// Track last notification to avoid duplicates
let lastNotifiedGameId: number | null = null;

export async function sendDiscordNotification(message: DiscordMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured');
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
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

export async function notifyGameStarted(gameId: number, gameMode: string, championName?: string): Promise<boolean> {
  // Avoid duplicate notifications for the same game
  if (lastNotifiedGameId === gameId) {
    return false;
  }
  lastNotifiedGameId = gameId;

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.com';

  return sendDiscordNotification({
    content: '@everyone',
    embeds: [{
      title: '🎰 JOHNNY EST EN GAME !',
      description: `Les paris sont ouverts pendant **3 minutes** !\n\n**Viens parier sur le feed de Johnny !**`,
      color: COLORS.GREEN,
      fields: [
        {
          name: '🎮 Mode de jeu',
          value: gameMode || 'Ranked Solo/Duo',
          inline: true,
        },
        ...(championName ? [{
          name: '🏆 Champion',
          value: championName,
          inline: true,
        }] : []),
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
        text: 'JohnnyFF15 - Le casino du feed',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

export async function notifyBettingClosed(gameId: number): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.com';

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

export async function notifyGameEnded(won: boolean, kills: number, deaths: number, assists: number, championName: string): Promise<boolean> {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://johnnyff15.com';

  return sendDiscordNotification({
    embeds: [{
      title: won ? '✅ VICTOIRE (comment ?!)' : '💀 DÉFAITE (comme prévu)',
      description: `Johnny a terminé sa game en **${championName}**`,
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
