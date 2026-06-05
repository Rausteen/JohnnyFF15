import type { CrosswordGridData, GridSet, WordInput } from './gridrushTypes';
import { generateCrosswordLayout, assignMysteryCells, normalize } from './crosswordEngine';

const easyWords: WordInput[] = [
  { answer: 'Arceus', clue: 'Dieu de Pokémon', acceptedAnswers: ['Arceus'] },
  { answer: 'Gekko', clue: 'Pogo, altégo, verti, mordicus', acceptedAnswers: ['Gekko'] },
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

// --- Set 2: Jeux Vidéo ---

const easyWords2: WordInput[] = [
  { answer: 'Mario', clue: 'Le célèbre plombier rouge de Nintendo', acceptedAnswers: ['Mario'] },
  { answer: 'Zelda', clue: "La princesse d'Hyrule à sauver", acceptedAnswers: ['Zelda'] },
  { answer: 'Sonic', clue: 'Hérisson bleu supersonique de SEGA', acceptedAnswers: ['Sonic'] },
  { answer: 'Pikachu', clue: 'Pokémon électrique numéro 025', acceptedAnswers: ['Pikachu'] },
  { answer: 'Luigi', clue: 'Le frère en vert de Mario', acceptedAnswers: ['Luigi'] },
  { answer: 'Link', clue: 'Le héros elfe porteur de la Triforce', acceptedAnswers: ['Link'] },
  { answer: 'Samus', clue: 'La chasseuse de primes de Metroid', acceptedAnswers: ['Samus'] },
  { answer: 'Kirby', clue: 'La petite boule rose qui avale tout', acceptedAnswers: ['Kirby'] },
  { answer: 'Yoshi', clue: 'Le dinosaure vert monture de Mario', acceptedAnswers: ['Yoshi'] },
];

const mediumWords2: WordInput[] = [
  { answer: 'Halo', clue: 'FPS Xbox où tu combats les Covenants avec le Master Chief', acceptedAnswers: ['Halo'] },
  { answer: 'Kratos', clue: 'Le dieu de la guerre du studio Santa Monica', acceptedAnswers: ['Kratos'] },
  { answer: 'Minecraft', clue: 'Jeu de construction en blocs cubiques créé par Notch', acceptedAnswers: ['Minecraft'] },
  { answer: 'Diablo', clue: "Hack & slash de Blizzard où tu plonges en Enfer", acceptedAnswers: ['Diablo'] },
  { answer: 'Portal', clue: 'Tu résous des énigmes avec un pistolet de téléportation', acceptedAnswers: ['Portal'] },
  { answer: 'Tetris', clue: 'Jeu de pièces tombantes inventé par un Soviétique', acceptedAnswers: ['Tetris'] },
  { answer: 'Bioshock', clue: 'Rapture : une ville sous-marine dystopique des années 60', acceptedAnswers: ['Bioshock', 'BioShock'] },
  { answer: 'Overwatch', clue: 'Shooter héroïque de Blizzard avec Tracer et Reaper', acceptedAnswers: ['Overwatch'] },
  { answer: 'Doom', clue: "Le FPS originel de id Software, sorti en 1993", acceptedAnswers: ['Doom'] },
];

const hardWords2: WordInput[] = [
  { answer: 'Kojima', clue: 'Le génie derrière Metal Gear Solid et Death Stranding', acceptedAnswers: ['Kojima'] },
  { answer: 'Roguelike', clue: 'Genre où chaque mort est permanente et les donjons générés aléatoirement', acceptedAnswers: ['Roguelike'] },
  { answer: 'Glados', clue: "L'IA sadique de Portal, obsédée par la science et le mensonge", acceptedAnswers: ['Glados', 'GLaDOS'] },
  { answer: 'FromSoftware', clue: 'Le studio japonais derrière Dark Souls, Bloodborne et Elden Ring', acceptedAnswers: ['FromSoftware', 'From Software'] },
  { answer: 'Dualshock', clue: 'Manette emblématique de Sony introduite avec la PS1 en 1997', acceptedAnswers: ['Dualshock', 'DualShock'] },
  { answer: 'Speedrun', clue: 'Terminer un jeu le plus vite possible, souvent en exploitant des bugs', acceptedAnswers: ['Speedrun', 'Speed Run'] },
  { answer: 'Hitbox', clue: "Zone de collision invisible qui détermine si un coup touche", acceptedAnswers: ['Hitbox'] },
  { answer: 'Lootbox', clue: "Boîte mystère payante controversée, comparée aux jeux d'argent", acceptedAnswers: ['Lootbox', 'Loot Box'] },
  { answer: 'Respawn', clue: 'Studio derrière Titanfall, Apex Legends et Jedi Fallen Order', acceptedAnswers: ['Respawn'] },
];

let cachedGridSet: GridSet | null = null;
let cachedGridSet2: GridSet | null = null;

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

export function getDefaultGridSet2(): GridSet {
  if (cachedGridSet2) return cachedGridSet2;

  const easy = buildGrid('default2-easy', 'Facile — Jeux Vidéo', 'easy', easyWords2, 'Gameboy',
    'Je suis une console portable Nintendo sortie en 1989. Mon nom évoque la lumière du jour. J\'ai fait connaître Tetris au monde entier.',
    'Console portable Nintendo de 1989', 'Mon nom évoque la lumière du jour');

  const medium = buildGrid('default2-medium', 'Moyen — Jeux Vidéo', 'medium', mediumWords2, 'FF7',
    'Je suis le septième opus d\'une saga RPG japonaise légendaire. Je mets en scène Cloud Strife, une épée aussi grande qu\'un homme, et une ville corrompue par le Mako.',
    'Suite RPG japonaise légendaire', 'Cloud Strife et le Mako');

  const hard = buildGrid('default2-hard', 'Difficile — Jeux Vidéo', 'hard', hardWords2, 'Cancel',
    'Je suis une technique de jeu compétitif dans les jeux de combat. Je consiste à annuler l\'animation d\'une attaque avant qu\'elle se termine pour en enchaîner une autre immédiatement.',
    'Technique de jeu de combat compétitif', 'Annuler une animation pour enchaîner');

  cachedGridSet2 = { id: 'default-set-2', name: 'Jeux Vidéo', grids: [easy, medium, hard], createdBy: 'System', createdAt: new Date().toISOString() };
  return cachedGridSet2;
}

export interface DefaultSetInfo {
  id: string;
  name: string;
}

export const DEFAULT_SETS: DefaultSetInfo[] = [
  { id: 'default-set', name: 'Set Initial' },
  { id: 'default-set-2', name: 'Jeux Vidéo' },
];

export function getDefaultGridSetById(id: string): GridSet | null {
  if (id === 'default-set') return getDefaultGridSet();
  if (id === 'default-set-2') return getDefaultGridSet2();
  return null;
}

export function isDefaultSetId(id: string): boolean {
  return id === 'default-set' || id === 'default-set-2';
}
