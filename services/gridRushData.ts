// GridRush - Grid data types and default test grid

export interface GridWord {
  clue: string;
  answer: string;
}

export interface GridCategory {
  words: GridWord[];
  finalWord: {
    clue: string;
    answer: string;
    hintAfter8: string;
  };
  pointsPerWord: number;
  finalWordPoints: number;
}

export interface GridData {
  FACILE: GridCategory;
  MOYEN: GridCategory;
  DIFFICILE: GridCategory;
}

export type Difficulty = 'FACILE' | 'MOYEN' | 'DIFFICILE';
export const DIFFICULTIES: Difficulty[] = ['FACILE', 'MOYEN', 'DIFFICILE'];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  FACILE: 'text-green-400',
  MOYEN: 'text-yellow-400',
  DIFFICILE: 'text-red-400',
};

export const DIFFICULTY_BG: Record<Difficulty, string> = {
  FACILE: 'from-green-500/20 to-green-900/10 border-green-500/30',
  MOYEN: 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/30',
  DIFFICILE: 'from-red-500/20 to-red-900/10 border-red-500/30',
};

// Normalize answer for comparison (lowercase, remove accents, remove non-alphanum)
export function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Team color options
export const TEAM_COLORS = [
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#22c55e' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rose', value: '#ec4899' },
];

// Default test grid
export const DEFAULT_GRID: GridData = {
  FACILE: {
    pointsPerWord: 100,
    finalWordPoints: 500,
    words: [
      { clue: "DIEU DE POKEMON", answer: "Arceus" },
      { clue: "POGO ALTEGO VERTI MORDICUS", answer: "Geeko" },
      { clue: "MAMMA MIA", answer: "Mario" },
      { clue: "L'oeuf le plus convoité", answer: "Dofus" },
      { clue: "Expedition 33", answer: "Clair Obscur" },
      { clue: "Technique très puissante inventée par Kamé Sennin", answer: "Kaméhaméha" },
      { clue: "600 dégats", answer: "Vayne" },
      { clue: "L'application que tu utilise en ce moment", answer: "Discord" },
      { clue: "Phrase emblématique de la salle d'audience", answer: "Objection" },
      { clue: "La boisson qui donne des ailes", answer: "Redbull" },
    ],
    finalWord: {
      clue: "Tu l'aime quand tu le joue mais tu le détester quand il faut le contrer",
      answer: "MegaChevalier",
      hintAfter8: "Clash Royale",
    },
  },
  MOYEN: {
    pointsPerWord: 200,
    finalWordPoints: 500,
    words: [
      { clue: "Jeu d'alcool en Corée", answer: "APT" },
      { clue: 'Entre "Storage" et "Security"', answer: "Electrical" },
      { clue: "Maître de la Ligue de Sinnoh", answer: "Cynthia" },
      { clue: "Le royaume de Zelda", answer: "Hyrule" },
      { clue: "Le premier deteste quand elle est bleu", answer: "Carapace" },
      { clue: "Maîtrise soleil et lune", answer: "Benimaru" },
      { clue: "Chapeau des mages", answer: "Rabadon" },
      { clue: "Voyage avec Sacha et Pierre", answer: "Ondine" },
      { clue: "Monde où vivent les champions", answer: "Runeterra" },
      { clue: "Plus ton % est haut, plus tu trembles", answer: "Smash Bros" },
    ],
    finalWord: {
      clue: "NUMERO 456",
      answer: "LeeJungJae",
      hintAfter8: "Squid Game",
    },
  },
  DIFFICILE: {
    pointsPerWord: 300,
    finalWordPoints: 500,
    words: [
      { clue: "La voiture de base", answer: "Octane" },
      { clue: "Dresseur du Monde des Douze", answer: "Osamodas" },
      { clue: "MOAB", answer: "Bloons" },
      { clue: "Qu'on monte ou qu'on descende on sera toujours lié", answer: "ChainedTogether" },
      { clue: "Taric, Atreus, Diana et Tyari ont atteint son sommet", answer: "Targon" },
      { clue: "Roi des Gerudos", answer: "Ganondorf" },
      { clue: "Ta seule arme dès le drop", answer: "Pioche" },
      { clue: "Les pros en posent 40 par game, toi 2", answer: "Ward" },
      { clue: "Celui qui a couper la queue de vegeta", answer: "Yajirobe" },
      { clue: "Bienvenue sur l'île, la dette t'attend déjà", answer: "Tom Nook" },
    ],
    finalWord: {
      clue: '"Chut... il est la"',
      answer: "Huntsman",
      hintAfter8: "",
    },
  },
};
