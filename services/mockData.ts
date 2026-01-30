import { Prop, MatchHistoryItem } from '../types';

// Ces paris sont UNIQUEMENT ceux vérifiables via l'API Riot Games (match-v5)
// Les cotes sont ajustées pour être drôles et réalistes selon le niveau de Johnny

export const MOCK_PROPS: Prop[] = [
  // ========== LOW RISK ==========
  {
    id: 'out2',
    title: "Défaite",
    description: "{player} perd la game.",
    odds: 1.7,
    category: 'LATE'
  },
  {
    id: 'early3',
    title: "5 morts ou plus",
    description: "{player} meurt au moins 5 fois.",
    odds: 1.8,
    category: 'EARLY'
  },
  {
    id: 'gp1',
    title: "CS de la honte (<4/min)",
    description: "Moins de 4 CS par minute.",
    odds: 1.7,
    category: 'GAMEPLAY'
  },

  // ========== MEDIUM RISK ==========
  {
    id: 'gp7',
    title: "CS > 9.5/min",
    description: "Plus de 9.5 CS par minute. Farm de Challenger.",
    odds: 12.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'kda1',
    title: "10 morts ou plus",
    description: "{player} termine avec 10 morts ou plus.",
    odds: 2.8,
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
    title: "Participation < 15%",
    description: "Participe à moins de 15% des kills.",
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
    odds: 6.0,
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
  {
    id: 'sp5',
    title: "L'Invisible",
    description: "Moins de 5000 dégâts + moins de 10% KP.",
    odds: 10.0,
    category: 'GAMEPLAY'
  },

  // ========== MIRACLES ==========
  {
    id: 'kda6',
    title: "KDA positif (≥1.0)",
    description: "Plus de participation que de morts.",
    odds: 1.6,
    category: 'KDA'
  },
  {
    id: 'out3',
    title: "VICTOIRE",
    description: "{player} gagne.",
    odds: 1.6,
    category: 'LATE'
  },
  {
    id: 'sp4',
    title: "Victoire + KDA > 2",
    description: "{player} gagne ET joue très bien.",
    odds: 4.0,
    category: 'LATE'
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
