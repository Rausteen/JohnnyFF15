// Riot Games API Service for JohnnyFF15
// Documentation: https://developer.riotgames.com/apis

const RIOT_API_KEY = import.meta.env.VITE_RIOT_API_KEY;

// Queue ID to readable name mapping
export const QUEUE_TYPES: Record<number, string> = {
  0: 'Custom',
  400: 'Normal Draft',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  700: 'Clash',
  830: 'Co-op vs AI (Intro)',
  840: 'Co-op vs AI (Beginner)',
  850: 'Co-op vs AI (Intermediate)',
  900: 'ARURF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1900: 'URF',
};

// Get queue name from ID
export function getQueueName(queueId: number): string {
  return QUEUE_TYPES[queueId] || `Mode ${queueId}`;
}

// Champion ID to name mapping (most common champions)
// Full list from Data Dragon: https://ddragon.leagueoflegends.com/cdn/14.1.1/data/en_US/champion.json
export const CHAMPIONS: Record<number, string> = {
  1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
  6: 'Urgot', 7: 'LeBlanc', 8: 'Vladimir', 9: 'Fiddlesticks', 10: 'Kayle',
  11: 'Master Yi', 12: 'Alistar', 13: 'Ryze', 14: 'Sion', 15: 'Sivir',
  16: 'Soraka', 17: 'Teemo', 18: 'Tristana', 19: 'Warwick', 20: 'Nunu & Willump',
  21: 'Miss Fortune', 22: 'Ashe', 23: 'Tryndamere', 24: 'Jax', 25: 'Morgana',
  26: 'Zilean', 27: 'Singed', 28: 'Evelynn', 29: 'Twitch', 30: 'Karthus',
  31: "Cho'Gath", 32: 'Amumu', 33: 'Rammus', 34: 'Anivia', 35: 'Shaco',
  36: 'Dr. Mundo', 37: 'Sona', 38: 'Kassadin', 39: 'Irelia', 40: 'Janna',
  41: 'Gangplank', 42: 'Corki', 43: 'Karma', 44: 'Taric', 45: 'Veigar',
  48: 'Trundle', 50: 'Swain', 51: 'Caitlyn', 53: 'Blitzcrank', 54: 'Malphite',
  55: 'Katarina', 56: 'Nocturne', 57: 'Maokai', 58: 'Renekton', 59: 'Jarvan IV',
  60: 'Elise', 61: 'Orianna', 62: 'Wukong', 63: 'Brand', 64: 'Lee Sin',
  67: 'Vayne', 68: 'Rumble', 69: 'Cassiopeia', 72: 'Skarner', 74: 'Heimerdinger',
  75: 'Nasus', 76: 'Nidalee', 77: 'Udyr', 78: 'Poppy', 79: 'Gragas',
  80: 'Pantheon', 81: 'Ezreal', 82: 'Mordekaiser', 83: 'Yorick', 84: 'Akali',
  85: 'Kennen', 86: 'Garen', 89: 'Leona', 90: 'Malzahar', 91: 'Talon',
  92: 'Riven', 96: "Kog'Maw", 98: 'Shen', 99: 'Lux', 101: 'Xerath',
  102: 'Shyvana', 103: 'Ahri', 104: 'Graves', 105: 'Fizz', 106: 'Volibear',
  107: 'Rengar', 110: 'Varus', 111: 'Nautilus', 112: 'Viktor', 113: 'Sejuani',
  114: 'Fiora', 115: 'Ziggs', 117: 'Lulu', 119: 'Draven', 120: 'Hecarim',
  121: "Kha'Zix", 122: 'Darius', 126: 'Jayce', 127: 'Lissandra', 131: 'Diana',
  133: 'Quinn', 134: 'Syndra', 136: 'Aurelion Sol', 141: 'Kayn', 142: 'Zoe',
  143: 'Zyra', 145: "Kai'Sa", 147: 'Seraphine', 150: 'Gnar', 154: 'Zac',
  157: 'Yasuo', 161: "Vel'Koz", 163: 'Taliyah', 164: 'Camille', 166: "Akshan",
  200: "Bel'Veth", 201: 'Braum', 202: 'Jhin', 203: 'Kindred', 221: 'Zeri',
  222: 'Jinx', 223: 'Tahm Kench', 233: 'Briar', 234: 'Viego', 235: 'Senna',
  236: 'Lucian', 238: 'Zed', 240: 'Kled', 245: 'Ekko', 246: 'Qiyana',
  254: 'Vi', 266: 'Aatrox', 267: 'Nami', 268: 'Azir', 350: 'Yuumi',
  360: 'Samira', 412: 'Thresh', 420: 'Illaoi', 421: "Rek'Sai", 427: 'Ivern',
  429: 'Kalista', 432: 'Bard', 497: 'Rakan', 498: 'Xayah', 516: 'Ornn',
  517: 'Sylas', 518: 'Neeko', 523: 'Aphelios', 526: 'Rell', 555: 'Pyke',
  711: 'Vex', 777: 'Yone', 875: "Sett", 876: 'Lillia', 887: 'Gwen',
  888: 'Renata Glasc', 895: 'Nilah', 897: "K'Sante", 901: 'Smolder',
  902: 'Milio', 910: 'Hwei', 950: 'Naafiri', 893: 'Aurora'
};

// Get champion name from ID
export function getChampionName(championId: number): string {
  return CHAMPIONS[championId] || `Champion #${championId}`;
}

// Regional routing
const REGIONS = {
  EUW: {
    platform: 'euw1',
    regional: 'europe'
  },
  EUNE: {
    platform: 'eun1',
    regional: 'europe'
  },
  NA: {
    platform: 'na1',
    regional: 'americas'
  },
  KR: {
    platform: 'kr',
    regional: 'asia'
  }
};

export type Region = keyof typeof REGIONS;

// API Response Types
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface CurrentGameInfo {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  platformId: string;
  gameMode: string;
  bannedChampions: BannedChampion[];
  gameQueueConfigId: number;
  observers: { encryptionKey: string };
  participants: CurrentGameParticipant[];
}

export interface BannedChampion {
  pickTurn: number;
  championId: number;
  teamId: number;
}

export interface CurrentGameParticipant {
  championId: number;
  perks: { perkIds: number[]; perkStyle: number; perkSubStyle: number };
  profileIconId: number;
  bot: boolean;
  teamId: number;
  summonerName: string;
  summonerId: string;
  puuid: string;
  spell1Id: number;
  spell2Id: number;
  gameCustomizationObjects: any[];
}

export interface MatchDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: MatchInfo;
}

export interface MatchInfo {
  gameCreation: number;
  gameDuration: number;
  gameEndTimestamp: number;
  gameId: number;
  gameMode: string;
  gameName: string;
  gameStartTimestamp: number;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participants: MatchParticipant[];
  platformId: string;
  queueId: number;
  teams: TeamDto[];
  tournamentCode: string;
}

export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  firstBloodKill: boolean;
  firstBloodAssist: boolean;
  firstTowerKill: boolean;
  firstTowerAssist: boolean;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  timeCCingOthers: number;
  totalTimeSpentDead: number;
  gameEndedInEarlySurrender: boolean;
  gameEndedInSurrender: boolean;
  teamEarlySurrendered: boolean;
}

export interface TeamDto {
  bans: BannedChampion[];
  objectives: {
    baron: ObjectiveDto;
    champion: ObjectiveDto;
    dragon: ObjectiveDto;
    inhibitor: ObjectiveDto;
    riftHerald: ObjectiveDto;
    tower: ObjectiveDto;
  };
  teamId: number;
  win: boolean;
}

export interface ObjectiveDto {
  first: boolean;
  kills: number;
}

class RiotApiService {
  private region: Region = 'EUW';

  setRegion(region: Region) {
    this.region = region;
  }

  private get platformUrl() {
    return `https://${REGIONS[this.region].platform}.api.riotgames.com`;
  }

  private get regionalUrl() {
    return `https://${REGIONS[this.region].regional}.api.riotgames.com`;
  }

  private async fetch<T>(url: string): Promise<T | null> {
    if (!RIOT_API_KEY) {
      console.error('RIOT_API_KEY not configured');
      return null;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(`Riot API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Riot API fetch error:', error);
      return null;
    }
  }

  // Get PUUID from Riot ID (gameName#tagLine)
  async getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount | null> {
    const url = `${this.regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.fetch<RiotAccount>(url);
  }

  // Check if player is currently in game
  async getCurrentGame(puuid: string): Promise<CurrentGameInfo | null> {
    const url = `${this.platformUrl}/lol/spectator/v5/active-games/by-summoner/${puuid}`;
    return this.fetch<CurrentGameInfo>(url);
  }

  // Get recent match IDs
  async getMatchHistory(puuid: string, count: number = 10): Promise<string[] | null> {
    const url = `${this.regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
    return this.fetch<string[]>(url);
  }

  // Get match details
  async getMatch(matchId: string): Promise<MatchDto | null> {
    const url = `${this.regionalUrl}/lol/match/v5/matches/${matchId}`;
    return this.fetch<MatchDto>(url);
  }

  // Get the most recent match
  async getLastMatch(puuid: string): Promise<MatchDto | null> {
    const matchIds = await this.getMatchHistory(puuid, 1);
    if (!matchIds || matchIds.length === 0) return null;
    return this.getMatch(matchIds[0]);
  }

  // Helper: Get player stats from a match
  getPlayerStatsFromMatch(match: MatchDto, puuid: string): MatchParticipant | null {
    return match.info.participants.find(p => p.puuid === puuid) || null;
  }

  // Helper: Check if player died 10+ times before game ended
  checkDeaths(stats: MatchParticipant, threshold: number = 10): boolean {
    return stats.deaths >= threshold;
  }

  // Helper: Check if game was FF15 (early surrender)
  checkFF15(stats: MatchParticipant): boolean {
    return stats.gameEndedInEarlySurrender || stats.teamEarlySurrendered;
  }

  // Helper: Get KDA string
  getKDA(stats: MatchParticipant): string {
    return `${stats.kills}/${stats.deaths}/${stats.assists}`;
  }

  // Helper: Calculate KDA ratio
  getKDARatio(stats: MatchParticipant): number {
    return (stats.kills + stats.assists) / Math.max(1, stats.deaths);
  }
}

export const riotApi = new RiotApiService();
