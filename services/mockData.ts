import { Prop, MatchHistoryItem } from '../types';

// Ces paris sont UNIQUEMENT ceux vérifiables via l'API Riot Games (match-v5)
// Les cotes sont ajustées pour être drôles et réalistes selon le niveau de Johnny

export const MOCK_PROPS: Prop[] = [
  // ========== LOW RISK ==========
  {
    id: 'out2',
    title: "Défaite",
    description: "{player} perd la game.",
    odds: 2.0,
    category: 'LATE'
  },
  {
    id: 'early3',
    title: "5 morts ou plus",
    description: "{player} meurt au moins 5 fois.",
    odds: 1.6,
    category: 'EARLY'
  },
  {
    id: 'early6',
    title: "4 morts ou moins",
    description: "{player} meurt 4 fois ou moins.",
    odds: 2.0,
    category: 'EARLY'
  },
  {
    id: 'gp1',
    title: "CS de la honte (<4/min)",
    description: "Moins de 4 CS par minute.",
    odds: 3.0,
    category: 'GAMEPLAY'
  },

  // ========== MEDIUM RISK ==========
  {
    id: 'gp7',
    title: "CS > 9.5/min",
    description: "Plus de 9.5 CS par minute. Farm de Challenger.",
    odds: 5.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'kda1',
    title: "10 morts ou plus",
    description: "{player} termine avec 10 morts ou plus.",
    odds: 2.7,
    category: 'KDA'
  },
  {
    id: 'kda3',
    title: "KDA < 0.5",
    description: "Ratio (K+A)/D inférieur à 0.5.",
    odds: 3.0,
    category: 'KDA'
  },
  {
    id: 'gp4',
    title: "Moins de 8k dégâts",
    description: "Moins de 8000 dégâts aux champions.",
    odds: 2.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp6',
    title: "Participation < 25%",
    description: "Participe à moins de 25% des kills.",
    odds: 2.5,
    category: 'GAMEPLAY'
  },
  {
    id: 'early1',
    title: "First Blood victime",
    description: "{player} donne le first blood.",
    odds: 2.5,
    category: 'EARLY'
  },

  // ========== HIGH RISK ==========
  {
    id: 'kda4',
    title: "0 Kill toute la game",
    description: "{player} termine sans aucun kill.",
    odds: 4.0,
    category: 'KDA'
  },
  {
    id: 'kda5',
    title: "0 Assist toute la game",
    description: "{player} termine sans aucune assist.",
    odds: 7.0,
    category: 'KDA'
  },
  {
    id: 'out1',
    title: "FF avant 20 min",
    description: "Surrender avant 20 minutes.",
    odds: 3.5,
    category: 'LATE'
  },
  {
    id: 'gp5',
    title: "Moins d'or que le support",
    description: "{player} finit avec moins d'or que le support allié.",
    odds: 4.0,
    category: 'GAMEPLAY'
  },

  // ========== LEGENDARY / THROW ==========
  {
    id: 'kda2',
    title: "Le 0/15 Légendaire",
    description: "15 morts ou plus.",
    odds: 5.0,
    category: 'KDA'
  },
  {
    id: 'sp1',
    title: "Le Perfect Int",
    description: "10+ morts, 0 kill, défaite.",
    odds: 7.0,
    category: 'KDA'
  },
  // ========== MIRACLES ==========
  {
    id: 'out3',
    title: "VICTOIRE",
    description: "{player} gagne.",
    odds: 2.0,
    category: 'LATE'
  },
  {
    id: 'kda6',
    title: "KDA ≥ 1",
    description: "{player} termine avec un KDA supérieur ou égal à 1.",
    odds: 1.35,
    category: 'KDA'
  },
  {
    id: 'kda9',
    title: "KDA ≥ 2",
    description: "{player} termine avec un KDA supérieur ou égal à 2.",
    odds: 2.5,
    category: 'KDA'
  },

  // ========== SOLO KILLS ==========
  {
    id: 'sk1',
    title: "3 Solo Kills ou plus",
    description: "{player} fait 3 solo kills ou plus.",
    odds: 3.0,
    category: 'KDA'
  },
  {
    id: 'sk2',
    title: "5 Solo Kills ou plus",
    description: "{player} fait 5 solo kills ou plus.",
    odds: 6.0,
    category: 'KDA'
  },
  {
    id: 'sk3',
    title: "0 Solo Kill",
    description: "{player} ne fait aucun solo kill.",
    odds: 1.8,
    category: 'KDA'
  },

  // ========== SOLO DEATHS (Timeline API) ==========
  {
    id: 'sd1',
    title: "0 Solo Death",
    description: "{player} ne se fait jamais solo kill.",
    odds: 2.5,
    category: 'KDA'
  },
  {
    id: 'sd2',
    title: "3+ Solo Deaths",
    description: "{player} se fait solo kill 3 fois ou plus.",
    odds: 2.5,
    category: 'KDA'
  },
  {
    id: 'sd3',
    title: "5+ Solo Deaths",
    description: "{player} se fait solo kill 5 fois ou plus.",
    odds: 5.0,
    category: 'KDA'
  },

  // ========== LÉGENDES ABSOLUES ==========
  {
    id: 'kda7',
    title: "Double kill ou plus",
    description: "{player} fait un double kill.",
    odds: 3.5,
    category: 'KDA'
  },
  {
    id: 'kda8',
    title: "Triple kill ou plus",
    description: "{player} fait un triple kill.",
    odds: 8.0,
    category: 'KDA'
  },
  {
    id: 'early5',
    title: "First Blood kill",
    description: "{player} fait le premier kill de la game.",
    odds: 5.0,
    category: 'EARLY'
  },
  {
    id: 'sp2',
    title: "Le Miracle KDA",
    description: "{player} termine avec un KDA > 3.0.",
    odds: 8.0,
    category: 'LATE'
  },
  {
    id: 'sp3',
    title: "Le Carry Mystique",
    description: "{player} top damage de son équipe.",
    odds: 12.0,
    category: 'LATE'
  },
  {
    id: 'sp6',
    title: "Le Pentakill",
    description: "{player} fait un pentakill.",
    odds: 50.0,
    category: 'LATE'
  }
];

export const MOCK_HISTORY: MatchHistoryItem[] = [
  {
    id: 'm_prev_1',
    date: '12/01',
    description: "Le Yasuo 0/14 légendaire",
    stats: {
      champion: 'Yasuo',
      kda: '0/14/2',
      cs: 84,
      duration: '19:20',
      result: 'DEFEAT',
      funFact: "A blame le jungler 12 fois."
    }
  },
  {
    id: 'm_prev_2',
    date: '18/01',
    description: "Le remake qui a sauvé des vies",
    stats: {
      champion: 'Yone',
      kda: '0/1/0',
      cs: 4,
      duration: '03:15',
      result: 'REMAKE',
      funFact: "Midlaner adverse AFK. Dieu existe."
    }
  },
  {
    id: 'm_prev_3',
    date: '21/01',
    description: "600 dégâts en 30 minutes",
    stats: {
      champion: 'Malphite',
      kda: '1/4/12',
      cs: 120,
      duration: '32:45',
      result: 'VICTORY',
      funFact: "S'est fait carry par une Lulu top AD."
    }
  }
];
