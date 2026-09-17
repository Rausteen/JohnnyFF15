/**
 * Shared League of Legends static assets for the Discord notifications.
 *
 * Loads (once) from Data Dragon / Meraki:
 *   - champions (id -> name / image key)
 *   - runes (id -> name, style id -> tree name) in French
 *   - summoner spells (id -> name) in French
 *   - champion role play rates (to guess a role from the spectator API)
 *
 * Everything degrades gracefully: if a fetch fails we fall back to ids/labels.
 */

export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';

const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];

export const ROLE_LABELS: Record<Role, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
};

export const ROLE_EMOJI: Record<Role, string> = {
  TOP: '🛡️',
  JUNGLE: '🌲',
  MIDDLE: '🗡️',
  BOTTOM: '🏹',
  UTILITY: '💚',
};

// Summoner spell id -> emoji (ids are stable across patches)
const SPELL_EMOJI: Record<number, string> = {
  1: '✨',  // Cleanse
  3: '🐌',  // Exhaust
  4: '⚡',  // Flash
  6: '👻',  // Ghost
  7: '💚',  // Heal
  11: '🪓', // Smite
  12: '🌀', // Teleport
  13: '🔷', // Clarity
  14: '🔥', // Ignite
  21: '🛡️', // Barrier
  32: '❄️', // Mark (ARAM)
};

const SMITE_ID = 11;

export const RANK_LABELS: Record<string, string> = {
  IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or',
  PLATINUM: 'Platine', EMERALD: 'Émeraude', DIAMOND: 'Diamant',
  MASTER: 'Master', GRANDMASTER: 'Grand Master', CHALLENGER: 'Challenger',
};

const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

export const DEFAULT_PROFILE_ICON = 4644;

let ddragonVersion = '14.1.1';
const championNames: Record<number, string> = {};   // 266 -> "Aatrox"
const championKeys: Record<number, string> = {};    // 62 -> "MonkeyKing"
const championIdsByName: Record<string, number> = {}; // "MonkeyKing"/"Wukong" -> 62
const runeNames: Record<number, string> = {};       // 8010 -> "Conquérant"
const runeStyleNames: Record<number, string> = {};  // 8000 -> "Précision"
const spellNames: Record<number, string> = {};      // 4 -> "Saut éclair"
const roleRates: Record<number, Partial<Record<Role, number>>> = {};

let loaded = false;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Asset fetch failed (${res.status}): ${url}`);
      return null;
    }
    return await res.json() as T;
  } catch (error) {
    console.error(`Asset fetch error: ${url}`, error);
    return null;
  }
}

export async function loadLolAssets(): Promise<void> {
  if (loaded) return;

  const versions = await fetchJson<string[]>('https://ddragon.leagueoflegends.com/api/versions.json');
  if (versions?.[0]) ddragonVersion = versions[0];

  const base = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data`;

  const [champData, runeData, spellData, rateData] = await Promise.all([
    fetchJson<{ data: Record<string, { key: string; name: string }> }>(`${base}/en_US/champion.json`),
    fetchJson<Array<{ id: number; name: string; slots: Array<{ runes: Array<{ id: number; name: string }> }> }>>(`${base}/fr_FR/runesReforged.json`),
    fetchJson<{ data: Record<string, { key: string; name: string }> }>(`${base}/fr_FR/summoner.json`),
    fetchJson<{ data: Record<string, Record<Role, { playRate: number }>> }>('https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json'),
  ]);

  if (champData) {
    for (const [key, champ] of Object.entries(champData.data)) {
      const id = parseInt(champ.key, 10);
      championNames[id] = champ.name;
      championKeys[id] = key;
      championIdsByName[key.toLowerCase()] = id;
      championIdsByName[champ.name.toLowerCase()] = id;
    }
  }

  if (runeData) {
    for (const style of runeData) {
      runeStyleNames[style.id] = style.name;
      for (const slot of style.slots) {
        for (const rune of slot.runes) runeNames[rune.id] = rune.name;
      }
    }
  }

  if (spellData) {
    for (const spell of Object.values(spellData.data)) {
      spellNames[parseInt(spell.key, 10)] = spell.name;
    }
  }

  if (rateData) {
    for (const [id, rates] of Object.entries(rateData.data)) {
      const entry: Partial<Record<Role, number>> = {};
      for (const role of ROLES) entry[role] = rates[role]?.playRate ?? 0;
      roleRates[parseInt(id, 10)] = entry;
    }
  }

  loaded = true;
  console.log(`✅ LoL assets loaded (ddragon v${ddragonVersion}): ${Object.keys(championNames).length} champions, ${Object.keys(runeNames).length} runes, ${Object.keys(spellNames).length} spells, ${Object.keys(roleRates).length} role rates`);
}

export function getDdragonVersion(): string {
  return ddragonVersion;
}

export function getChampionName(id: number): string {
  return championNames[id] || `Champion${id}`;
}

export function getChampionNames(): Record<number, string> {
  return championNames;
}

/** "MonkeyKing" -> "Wukong" (match-v5 championName is the internal key) */
export function getChampionDisplayName(nameOrKey: string): string {
  const id = championIdsByName[nameOrKey.toLowerCase()];
  return id ? championNames[id] : nameOrKey;
}

export function getChampionKeys(): Record<number, string> {
  return championKeys;
}

function resolveChampionKey(championNameOrId: string | number): string | null {
  if (typeof championNameOrId === 'number') {
    return championKeys[championNameOrId] || null;
  }
  const id = championIdsByName[championNameOrId.toLowerCase()];
  if (id) return championKeys[id];
  // Fallback: normalize the display name (works for most champions)
  return championNameOrId.replace(/['\s.]/g, '');
}

export function getChampionIconUrl(championNameOrId: string | number): string {
  const key = resolveChampionKey(championNameOrId);
  if (!key) return getProfileIconUrl(DEFAULT_PROFILE_ICON);
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${key}.png`;
}

export function getChampionSplashUrl(championNameOrId: string | number): string | null {
  const key = resolveChampionKey(championNameOrId);
  if (!key) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${key}_0.jpg`;
}

export function getProfileIconUrl(iconId: number = DEFAULT_PROFILE_ICON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${iconId}.png`;
}

export function getRankEmblemUrl(tier: string | null | undefined): string {
  if (!tier || !RANK_LABELS[tier]) {
    return getProfileIconUrl(DEFAULT_PROFILE_ICON);
  }
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}

export function formatRank(tier: string | null | undefined, division?: string | null, lp?: number | null): string {
  if (!tier) return 'Unranked';
  const label = RANK_LABELS[tier] || tier;
  const div = APEX_TIERS.includes(tier) || !division ? '' : ` ${division}`;
  const lpText = lp != null ? ` · ${lp} LP` : '';
  return `${label}${div}${lpText}`;
}

export function getRuneName(id: number | undefined): string | null {
  if (!id) return null;
  return runeNames[id] || null;
}

export function getRuneStyleName(id: number | undefined): string | null {
  if (!id) return null;
  return runeStyleNames[id] || null;
}

export function getSpellName(id: number | undefined): string | null {
  if (!id) return null;
  return spellNames[id] || null;
}

/** "⚡ Saut éclair · 🔥 Embrasement" */
export function formatSpells(spell1Id?: number, spell2Id?: number): string | null {
  const parts = [spell1Id, spell2Id]
    .filter((id): id is number => !!id)
    .map(id => `${SPELL_EMOJI[id] || '🔹'} ${getSpellName(id) || `Sort ${id}`}`);
  return parts.length ? parts.join(' · ') : null;
}

/** Keystone + secondary tree, e.g. { keystone: "Conquérant", secondary: "Détermination" } */
export function formatRunes(perkIds?: number[], perkSubStyle?: number): { keystone: string; secondary: string | null } | null {
  if (!perkIds?.length) return null;
  const keystone = getRuneName(perkIds[0]) || `Rune ${perkIds[0]}`;
  return { keystone, secondary: getRuneStyleName(perkSubStyle) };
}

export function formatRole(role: Role | null | undefined): string | null {
  if (!role || !ROLE_LABELS[role]) return null;
  return `${ROLE_EMOJI[role]} ${ROLE_LABELS[role]}`;
}

/**
 * Guess the role of a participant from the spectator API.
 *  1. Smite => Jungle
 *  2. The player's own history on this champion (if provided and meaningful)
 *  3. Global play rates for the champion (Meraki)
 */
export function guessRole(
  championId: number,
  spellIds: number[] = [],
  playerHistory?: Partial<Record<Role, number>>
): Role | null {
  if (spellIds.includes(SMITE_ID)) return 'JUNGLE';

  if (playerHistory) {
    const entries = (Object.entries(playerHistory) as Array<[Role, number]>)
      .filter(([role]) => role !== 'JUNGLE')
      .sort((a, b) => b[1] - a[1]);
    if (entries.length && entries[0][1] >= 2) return entries[0][0];
  }

  const rates = roleRates[championId];
  if (!rates) return null;
  const best = ROLES
    .filter(role => role !== 'JUNGLE')
    .map(role => [role, rates[role] ?? 0] as [Role, number])
    .sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

// ============================================
// Generic formatting helpers
// ============================================

export function formatK(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function formatSigned(value: number, formatter: (n: number) => string = String): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatter(Math.abs(value))}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** "███████░░░" style bar for win rates etc. */
export function progressBar(ratio: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export const DISCORD_COLORS = {
  GREEN: 0x22c55e,
  RED: 0xef4444,
  GOLD: 0xf59e0b,
  PURPLE: 0xa855f7,
  CYAN: 0x06b6d4,
  BLUE: 0x3b82f6,
  GREY: 0x64748b,
};
