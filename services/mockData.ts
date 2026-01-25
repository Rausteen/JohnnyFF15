import { Prop, MatchHistoryItem } from '../types';

// Ces paris sont UNIQUEMENT ceux vérifiables via l'API Riot Games (match-v5)
// Les cotes sont ajustées pour être drôles et réalistes selon le niveau de Johnny

export const MOCK_PROPS: Prop[] = [
  // ========== PARIS EARLY GAME ==========
  {
    id: 'early1',
    title: "First Blood victime",
    description: "Johnny est la première victime de la game.",
    odds: 1.4, // Très probable
    category: 'EARLY'
  },
  {
    id: 'early5',
    title: "First Blood kill",
    description: "Johnny fait le premier kill de la game.",
    odds: 12.0, // Très improbable
    category: 'EARLY'
  },
  {
    id: 'early2',
    title: "3 morts ou plus",
    description: "Johnny meurt au moins 3 fois dans la game.",
    odds: 1.6,
    category: 'EARLY'
  },
  {
    id: 'early3',
    title: "5 morts ou plus",
    description: "Johnny meurt au moins 5 fois. Le speedrun.",
    odds: 1.9,
    category: 'EARLY'
  },
  {
    id: 'early4',
    title: "0 mort toute la game",
    description: "Johnny ne meurt pas une seule fois.",
    odds: 4.5, // Rare
    category: 'EARLY'
  },

  // ========== PARIS KDA ==========
  {
    id: 'kda1',
    title: "Le 0/10 Powerspike",
    description: "Johnny termine avec 10 morts ou plus.",
    odds: 1.5, // Classique
    category: 'KDA'
  },
  {
    id: 'kda2',
    title: "Le 0/15 Légendaire",
    description: "15 morts ou plus. Record en vue.",
    odds: 2.8,
    category: 'KDA'
  },
  {
    id: 'kda3',
    title: "KDA < 0.5",
    description: "Ratio (K+A)/D inférieur à 0.5. Vraiment nul.",
    odds: 1.7,
    category: 'KDA'
  },
  {
    id: 'kda4',
    title: "0 Kill toute la game",
    description: "Johnny termine sans aucun kill.",
    odds: 2.2,
    category: 'KDA'
  },
  {
    id: 'kda5',
    title: "Johnny fait un kill",
    description: "Au moins 1 kill. Incroyable si ça arrive.",
    odds: 1.3,
    category: 'KDA'
  },
  {
    id: 'kda6',
    title: "KDA positif (≥1.0)",
    description: "Plus de participation que de morts.",
    odds: 3.5,
    category: 'KDA'
  },
  {
    id: 'kda7',
    title: "Double kill ou plus",
    description: "Johnny fait un double kill.",
    odds: 8.0, // Très rare
    category: 'KDA'
  },

  // ========== PARIS GAMEPLAY ==========
  {
    id: 'gp1',
    title: "CS de la honte (<4/min)",
    description: "Moins de 4 CS/min. Même un support fait mieux.",
    odds: 1.8,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp2',
    title: "0 Vision Score",
    description: "Aucune ward de toute la game.",
    odds: 5.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp3',
    title: "Vision < 5",
    description: "Vision score inférieur à 5.",
    odds: 2.5,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp4',
    title: "Moins de 8k dégâts",
    description: "Moins de 8000 dégâts aux champions.",
    odds: 2.2,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp5',
    title: "Moins d'or que le support",
    description: "Johnny a moins d'or que le support allié.",
    odds: 3.2,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp6',
    title: "Participation < 15%",
    description: "Participe à moins de 15% des kills.",
    odds: 2.0,
    category: 'GAMEPLAY'
  },

  // ========== PARIS RÉSULTAT ==========
  {
    id: 'out1',
    title: "FF avant 20 min",
    description: "Surrender avant 20 minutes.",
    odds: 2.5,
    category: 'LATE'
  },
  {
    id: 'out2',
    title: "Défaite",
    description: "Johnny perd. Le classique.",
    odds: 1.2, // Très probable
    category: 'LATE'
  },
  {
    id: 'out3',
    title: "VICTOIRE",
    description: "Johnny GAGNE. Miraculeux.",
    odds: 4.0,
    category: 'LATE'
  },
  {
    id: 'out4',
    title: "Game > 40 min",
    description: "La torture dure plus de 40 minutes.",
    odds: 3.0,
    category: 'LATE'
  },

  // ========== PARIS LÉGENDAIRES ==========
  {
    id: 'sp1',
    title: "Le Perfect Int",
    description: "10+ morts, 0 kill, défaite.",
    odds: 2.0,
    category: 'KDA'
  },
  {
    id: 'sp2',
    title: "Le Miracle KDA",
    description: "Johnny termine avec un KDA > 3.0.",
    odds: 15.0, // Légendaire
    category: 'LATE'
  },
  {
    id: 'sp3',
    title: "Le Carry Mystique",
    description: "Johnny top damage de son équipe.",
    odds: 25.0, // Mythique
    category: 'LATE'
  },
  {
    id: 'sp4',
    title: "Victoire + KDA > 2",
    description: "Johnny gagne ET joue bien.",
    odds: 12.0,
    category: 'LATE'
  },
  {
    id: 'sp5',
    title: "L'Invisible",
    description: "Moins de 5k dégâts + moins de 10% KP.",
    odds: 4.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'sp6',
    title: "Le Pentakill",
    description: "Johnny fait un pentakill.",
    odds: 100.0, // Impossible
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
