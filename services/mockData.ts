import { Prop, MatchHistoryItem } from '../types';

// Ces paris sont UNIQUEMENT ceux vérifiables via l'API Riot Games (match-v5)
// Données disponibles: kills, deaths, assists, cs, vision, damage, gold, duration, win/loss, firstBlood

export const MOCK_PROPS: Prop[] = [
  // ========== PARIS EARLY GAME (temps limité) ==========
  {
    id: 'early1',
    title: "First Blood victime",
    description: "Johnny est la première victime de la game.",
    odds: 2.5,
    category: 'EARLY',
    maxGameTime: 5
  },
  {
    id: 'early2',
    title: "0/3 avant 10 min",
    description: "Johnny meurt 3 fois avant la 10ème minute.",
    odds: 1.8,
    category: 'EARLY',
    maxGameTime: 10
  },
  {
    id: 'early3',
    title: "0/5 avant 15 min",
    description: "5 morts avant 15 minutes. Speedrun classique.",
    odds: 2.2,
    category: 'EARLY',
    maxGameTime: 15
  },

  // ========== PARIS KDA (vérifiables en fin de game) ==========
  {
    id: 'kda1',
    title: "Le 0/10 Powerspike",
    description: "Johnny termine avec 10 morts ou plus.",
    odds: 1.8,
    category: 'KDA'
  },
  {
    id: 'kda2',
    title: "KDA < 1.0",
    description: "Ratio (K+A)/D inférieur à 1. Plus de morts que de participation.",
    odds: 1.5,
    category: 'KDA'
  },
  {
    id: 'kda3',
    title: "0 Kill",
    description: "Johnny termine la game sans aucun kill.",
    odds: 2.0,
    category: 'KDA'
  },
  {
    id: 'kda4',
    title: "Plus de morts que l'équipe entière",
    description: "Johnny a plus de morts que la moyenne de son équipe x2.",
    odds: 3.5,
    category: 'KDA'
  },

  // ========== PARIS GAMEPLAY (stats de fin de game) ==========
  {
    id: 'gp1',
    title: "CS de la honte",
    description: "Moins de 5 CS/min à la fin de la game.",
    odds: 1.7,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp2',
    title: "Vision = 0",
    description: "Vision score de 0. Aucune ward posée.",
    odds: 4.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp3',
    title: "Vision < 10",
    description: "Vision score inférieur à 10. Il a oublié le bouton 4.",
    odds: 2.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp4',
    title: "Moins de 10k dégâts",
    description: "Dégâts aux champions < 10 000. Présent mais invisible.",
    odds: 2.5,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp5',
    title: "Moins d'or que le support",
    description: "Johnny a moins d'or que le support de son équipe.",
    odds: 3.0,
    category: 'GAMEPLAY'
  },

  // ========== PARIS RÉSULTAT ==========
  {
    id: 'out1',
    title: "Défaite rapide (< 20min)",
    description: "La game se termine en défaite avant 20 minutes.",
    odds: 2.8,
    category: 'LATE'
  },
  {
    id: 'out2',
    title: "Défaite normale",
    description: "Johnny perd la game (résultat classique).",
    odds: 1.3,
    category: 'LATE'
  },
  {
    id: 'out3',
    title: "Victoire !",
    description: "Johnny gagne la game. Oui, c'est possible.",
    odds: 2.5,
    category: 'LATE'
  },
  {
    id: 'out4',
    title: "Game > 35 min",
    description: "La game dure plus de 35 minutes. Torture prolongée.",
    odds: 2.2,
    category: 'LATE'
  },

  // ========== PARIS SPÉCIAUX (combinaisons vérifiables) ==========
  {
    id: 'sp1',
    title: "Le Miracle KDA",
    description: "Johnny termine avec un KDA > 3.0 (très rare).",
    odds: 10.0,
    category: 'LATE'
  },
  {
    id: 'sp2',
    title: "Participation < 20%",
    description: "Johnny participe à moins de 20% des kills de son équipe.",
    odds: 2.0,
    category: 'KDA'
  },
  {
    id: 'sp3',
    title: "Double digit deaths + Défaite",
    description: "10+ morts ET défaite. Le combo classique.",
    odds: 1.6,
    category: 'KDA'
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
