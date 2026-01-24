// Riot Games API Service for JohnnyFF15
// Documentation: https://developer.riotgames.com/apis

const RIOT_API_KEY = import.meta.env.VITE_RIOT_API_KEY;

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
