import type { CrosswordGridData, GridSet, WordInput } from './gridrushTypes';
import { generateCrosswordLayout, assignMysteryCells, normalize } from './crosswordEngine';

const easyWords: WordInput[] = [
  { answer: 'Arceus', clue: 'Dieu de Pokémon', acceptedAnswers: ['Arceus'] },
  { answer: 'Geeko', clue: 'Pogo, altégo, verti, mordicus', acceptedAnswers: ['Geeko'] },
  { answer: 'Mario', clue: 'Mamma mia !', acceptedAnswers: ['Mario'] },
  { answer: 'Dofus', clue: "L'oeuf le plus convoité", acceptedAnswers: ['Dofus'] },
  { answer: 'Clair Obscur', clue: 'Expédition 33', acceptedAnswers: ['Clair Obscur', 'ClairObscur'] },
  { answer: 'Kaméhaméha', clue: 'Technique très puissante inventée par Kamé Sennin', acceptedAnswers: ['Kaméhaméha', 'Kamehameha'] },
  { answer: 'Vayne', clue: '600 dégâts', acceptedAnswers: ['Vayne'] },
  { answer: 'Discord', clue: "L'application que tu utilises en ce moment", acceptedAnswers: ['Discord'] },
  { answer: 'Objection', clue: "Phrase emblématique de la salle d'audience", acceptedAnswers: ['Objection'] },
  { answer: 'Redbull', clue: 'La boisson qui donne des ailes', acceptedAnswers: ['Redbull', 'Red Bull'] },
];

const mediumWords: WordInput[] = [
  { answer: 'APT', clue: "Jeu d'alcool en Corée", acceptedAnswers: ['APT', 'Apt'] },
  { answer: 'Electrical', clue: 'Entre "Storage" et "Security"', acceptedAnswers: ['Electrical'] },
  { answer: 'Cynthia', clue: 'Maître de la Ligue de Sinnoh', acceptedAnswers: ['Cynthia'] },
  { answer: 'Hyrule', clue: 'Le royaume de Zelda', acceptedAnswers: ['Hyrule'] },
  { answer: 'Carapace', clue: 'Le premier déteste quand elle est bleue', acceptedAnswers: ['Carapace'] },
  { answer: 'Benimaru', clue: 'Maîtrise soleil et lune', acceptedAnswers: ['Benimaru'] },
  { answer: 'Rabadon', clue: 'Chapeau des mages', acceptedAnswers: ['Rabadon'] },
  { answer: 'Ondine', clue: 'Voyage avec Sacha et Pierre', acceptedAnswers: ['Ondine'] },
  { answer: 'Runeterra', clue: 'Monde où vivent les champions', acceptedAnswers: ['Runeterra'] },
  { answer: 'Smash Bros', clue: 'Plus ton % est haut, plus tu trembles', acceptedAnswers: ['Smash Bros', 'SmashBros', 'Super Smash Bros'] },
];

const hardWords: WordInput[] = [
  { answer: 'Octane', clue: 'La voiture de base', acceptedAnswers: ['Octane'] },
  { answer: 'Osamodas', clue: 'Dresseur du Monde des Douze', acceptedAnswers: ['Osamodas'] },
  { answer: 'Bloons', clue: 'MOAB', acceptedAnswers: ['Bloons'] },
  { answer: 'Chained Together', clue: "Qu'on monte ou qu'on descende on sera toujours lié", acceptedAnswers: ['Chained Together', 'ChainedTogether'] },
  { answer: 'Targon', clue: 'Taric, Atreus, Diana et Tyari ont atteint son sommet', acceptedAnswers: ['Targon'] },
  { answer: 'Ganondorf', clue: 'Roi des Gerudos', acceptedAnswers: ['Ganondorf'] },
  { answer: 'Pioche', clue: 'Ta seule arme dès le drop', acceptedAnswers: ['Pioche'] },
  { answer: 'Ward', clue: 'Les pros en posent 40 par game, toi 2', acceptedAnswers: ['Ward'] },
  { answer: 'Yajirobe', clue: 'Celui qui a coupé la queue de Végéta', acceptedAnswers: ['Yajirobe'] },
  { answer: 'Tom Nook', clue: "Bienvenue sur l'île, la dette t'attend déjà", acceptedAnswers: ['Tom Nook', 'TomNook'] },
];

let cachedGridSet: GridSet | null = null;

function buildGrid(
  id: string, name: string, difficulty: 'easy' | 'medium' | 'hard',
  wordInputs: WordInput[], mysteryWord: string, mysteryClue: string, mysteryHint5: string, mysteryHint8: string
): CrosswordGridData {
  const layout = generateCrosswordLayout(wordInputs);
  const mysteryCells = assignMysteryCells(layout.words, mysteryWord);
  return {
    id, name, difficulty, rows: layout.rows, cols: layout.cols,
    words: layout.words, mysteryCells,
    mysteryWord: normalize(mysteryWord), mysteryClue, mysteryHint5, mysteryHint8,
  };
}

export function getDefaultGridSet(): GridSet {
  if (cachedGridSet) return cachedGridSet;

  const easy = buildGrid('default-easy', 'Grille Facile', 'easy', easyWords, 'MegaChevalier',
    "Tu l'aimes quand tu le joues mais tu le détestes quand il faut le contrer",
    "Tu l'aimes quand tu le joues mais tu le détestes quand il faut le contrer", 'Clash Royale');

  const medium = buildGrid('default-medium', 'Grille Moyenne', 'medium', mediumWords, 'LeeJungJae',
    'Numéro 456', 'Numéro 456', 'Squid Game');

  const hard = buildGrid('default-hard', 'Grille Difficile', 'hard', hardWords, 'Huntsman',
    '"Chut... il est là"', '"Chut... il est là"', 'Lethal Company');

  cachedGridSet = { id: 'default-set', name: 'Set Initial', grids: [easy, medium, hard], createdBy: 'System', createdAt: new Date().toISOString() };
  return cachedGridSet;
}
