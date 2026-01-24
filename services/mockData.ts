import { Prop, MatchHistoryItem } from '../types';

export const MOCK_PROPS: Prop[] = [
  // Early game bets (disponibles uniquement en début de game)
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
    title: "Le 0/5 Speedrun",
    description: "5 morts avant 15 minutes. Un classique.",
    odds: 2.2,
    category: 'EARLY',
    maxGameTime: 15
  },

  // KDA bets
  {
    id: 'kda1',
    title: "Le 0/10 Powerspike",
    description: "Johnny atteint le fameux 0/10.",
    odds: 1.8,
    category: 'KDA'
  },
  {
    id: 'kda2',
    title: "KDA < 1.0",
    description: "Plus de morts que de kills + assists. Classique.",
    odds: 2.4,
    category: 'KDA'
  },
  {
    id: 'kda3',
    title: "Double digits deaths",
    description: "10 morts ou plus dans la game.",
    odds: 1.5,
    category: 'KDA'
  },

  // Gameplay bets
  {
    id: 'gp1',
    title: "Flash dans le mur",
    description: "Un flash raté mémorable.",
    odds: 1.3,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp2',
    title: "Le 1v5 suicide",
    description: "Johnny tente un 1v5 et meurt instantanément.",
    odds: 1.2,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp3',
    title: "CS de la honte",
    description: "Moins de 5 CS/min à la fin de la game.",
    odds: 2.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'gp4',
    title: "0 vision score",
    description: "Aucune ward posée de toute la game.",
    odds: 3.0,
    category: 'GAMEPLAY'
  },

  // Game outcome bets
  {
    id: 'out1',
    title: "FF15",
    description: "L'équipe surrender à 15 minutes.",
    odds: 3.5,
    category: 'TOXICITY'
  },
  {
    id: 'out2',
    title: "FF20",
    description: "Surrender entre 15 et 20 minutes.",
    odds: 2.5,
    category: 'TOXICITY'
  },
  {
    id: 'out3',
    title: "Victoire !",
    description: "Johnny gagne la game (oui c'est possible).",
    odds: 2.0,
    category: 'LATE'
  },

  // Special bets
  {
    id: 'sp1',
    title: "Le Miracle",
    description: "Johnny carry et fait MVP.",
    odds: 50.0,
    category: 'LATE'
  },
  {
    id: 'sp2',
    title: "Rage quit",
    description: "Johnny quitte la game avant la fin.",
    odds: 5.0,
    category: 'TOXICITY'
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
