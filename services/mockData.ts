import { Prop, MatchHistoryItem } from '../types';

export const MOCK_PROPS: Prop[] = [
  {
    id: 'p1',
    title: "Le 0/10 Powerspike",
    description: "Johnny meurt 10 fois ou plus avant 25 minutes.",
    odds: 1.8,
    category: 'KDA'
  },
  {
    id: 'p2',
    title: "KDA < 1.0",
    description: "KDA inférieur à la dignité humaine.",
    odds: 2.4,
    category: 'KDA'
  },
  {
    id: 'p3',
    title: "Flash dans le mur",
    description: "Un flash raté visible par tout le monde.",
    odds: 1.2,
    category: 'GAMEPLAY'
  },
  {
    id: 'p4',
    title: "Défaite Précoce",
    description: "L'équipe FF à 15 minutes pile.",
    odds: 3.5,
    category: 'TOXICITY'
  },
  {
    id: 'p5',
    title: "Yasuo Syndrome",
    description: "Johnny tente un 1v5 et meurt instantanément.",
    odds: 1.1,
    category: 'GAMEPLAY'
  },
  {
    id: 'p6',
    title: "Le Chat Ban",
    description: "Johnny écrit 'jgl diff' dans le chat all.",
    odds: 1.5,
    category: 'TOXICITY'
  },
  {
    id: 'p7',
    title: "CS de la honte",
    description: "Moins de 100 CS à 20 minutes.",
    odds: 2.0,
    category: 'GAMEPLAY'
  },
  {
    id: 'p8',
    title: "Le miracle",
    description: "Johnny carry la game (MVP).",
    odds: 50.0,
    category: 'GAMEPLAY'
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