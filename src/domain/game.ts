export type RandomSource = () => number
export type Direction = 'next' | 'previous'
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6

export interface Player {
  id: string
  name: string
  score: number
}

export interface Die {
  id: number
  value: DieValue | null
  locked: boolean
}

export interface Turn {
  dice: readonly Die[]
  rollCount: number
  phase: 'ready' | 'selecting' | 'complete'
}

export interface Game {
  players: readonly Player[]
  initialScore: number
  currentPlayerId: string
  lastPlayerId: string | null
  turn: Turn
  turnCount: number
}

export interface GameSummary {
  finishedAt: string
  initialScore: number
  players: readonly Player[]
  winnerId: string
  turnCount: number
}

export type TurnOutcome =
  | { kind: 'loss'; points: number }
  | { kind: 'neutral'; points: 0 }
  | { kind: 'attack'; points: number }

const FACES: readonly DieValue[] = [1, 2, 3, 4, 5, 6]

function randomIndex(length: number, random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('La fuente aleatoria debe devolver un número entre 0 y 1, sin incluir 1.')
  }
  return Math.floor(value * length)
}

export function shufflePlayers(players: readonly Player[], random: RandomSource = Math.random): Player[] {
  const shuffled = [...players]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1, random)
    const player = shuffled[index]
    shuffled[index] = shuffled[other]
    shuffled[other] = player
  }
  return shuffled
}

export function createGame(
  names: readonly string[],
  initialScore = 20,
  order: 'manual' | 'random' = 'random',
  random: RandomSource = Math.random,
): Game {
  if (names.length < 2 || names.length > 8) {
    throw new RangeError('La partida debe tener entre 2 y 8 jugadores.')
  }
  if (!Number.isInteger(initialScore) || initialScore < 10 || initialScore > 50) {
    throw new RangeError('El marcador inicial debe ser un entero entre 10 y 50.')
  }
  if (order !== 'manual' && order !== 'random') {
    throw new RangeError('El orden debe ser manual o aleatorio.')
  }
  const players = names.map((name, index) => ({
    id: `player-${index + 1}`,
    name: name.trim() || `Jugador ${index + 1}`,
    score: initialScore,
  }))
  const orderedPlayers = order === 'random' ? shufflePlayers(players, random) : players
  return {
    players: orderedPlayers,
    initialScore,
    currentPlayerId: orderedPlayers[0].id,
    lastPlayerId: null,
    turn: createTurn(),
    turnCount: 0,
  }
}

export function createTurn(): Turn {
  return {
    dice: Array.from({ length: 6 }, (_, id) => ({ id, value: null, locked: false })),
    rollCount: 0,
    phase: 'ready',
  }
}

export function rollDice(turn: Turn, random: RandomSource = Math.random): Turn {
  if (turn.phase !== 'ready' || turn.rollCount >= 5) {
    throw new Error('No se puede lanzar en este momento.')
  }
  const rollCount = turn.rollCount + 1
  const dice = turn.dice.map((die) => {
    if (die.locked) return die
    const value = FACES[randomIndex(FACES.length, random)]
    return { ...die, value, locked: rollCount === 5 }
  })
  return { dice, rollCount, phase: rollCount === 5 ? 'complete' : 'selecting' }
}

export function selectDice(turn: Turn, ids: readonly number[]): Turn {
  if (turn.phase !== 'selecting') {
    throw new Error('No se pueden apartar dados en este momento.')
  }
  const selected = new Set(ids)
  if (ids.length === 0 || selected.size !== ids.length) {
    throw new Error('Selecciona al menos un dado sin repetirlo.')
  }
  for (const id of selected) {
    const die = turn.dice.find((item) => item.id === id)
    if (!die || die.locked || die.value === null) {
      throw new Error('Solo se pueden apartar dados disponibles del último lanzamiento.')
    }
  }
  const dice = turn.dice.map((die) => selected.has(die.id) ? { ...die, locked: true } : die)
  return { ...turn, dice, phase: dice.every((die) => die.locked) ? 'complete' : 'ready' }
}

export function selectedTotal(turn: Turn): number {
  return turn.dice.reduce((sum, die) => {
    if (!die.locked) return sum
    if (die.value === null) throw new Error('Un dado apartado debe tener un valor.')
    return sum + die.value
  }, 0)
}

export function turnTotal(turn: Turn): number {
  if (turn.phase !== 'complete') {
    throw new Error('El turno todavía no ha terminado.')
  }
  return selectedTotal(turn)
}

export function calculateOutcome(total: number): TurnOutcome {
  if (!Number.isInteger(total) || total < 6 || total > 36) {
    throw new RangeError('La suma de los seis dados debe estar entre 6 y 36.')
  }
  if (total < 30) return { kind: 'loss', points: 30 - total }
  if (total > 30) return { kind: 'attack', points: total - 30 }
  return { kind: 'neutral', points: 0 }
}

function playerIndex(players: readonly Player[], id: string): number {
  const index = players.findIndex((player) => player.id === id)
  if (index < 0 || players.findIndex((player, next) => next !== index && player.id === id) !== -1) {
    throw new Error('El jugador debe existir una sola vez en el orden.')
  }
  return index
}

export function findNeighbor(players: readonly Player[], id: string, direction: Direction): Player {
  if (direction !== 'next' && direction !== 'previous') {
    throw new RangeError('La dirección debe ser siguiente o anterior.')
  }
  const index = playerIndex(players, id)
  const step = direction === 'next' ? 1 : -1
  for (let distance = 1; distance < players.length; distance++) {
    const candidate = players[(index + step * distance + players.length) % players.length]
    if (candidate.score > 0) return candidate
  }
  throw new Error('No hay otro jugador activo.')
}

export function winner(players: readonly Player[]): Player | null {
  const active = players.filter((player) => player.score > 0)
  if (active.length === 0) {
    throw new Error('La partida no tiene jugadores activos.')
  }
  return active.length === 1 ? active[0] : null
}

export function applyOutcome(
  players: readonly Player[],
  currentPlayerId: string,
  total: number,
  direction?: Direction,
): { players: Player[]; outcome: TurnOutcome; targetId: string | null } {
  const current = players[playerIndex(players, currentPlayerId)]
  if (current.score <= 0) throw new Error('Un jugador eliminado no puede jugar.')
  if (winner(players)) throw new Error('La partida ya terminó.')
  const outcome = calculateOutcome(total)
  let targetId: string | null = null
  if (outcome.kind === 'loss') targetId = current.id
  if (outcome.kind === 'attack') {
    if (direction === undefined) throw new Error('Selecciona una dirección para atacar.')
    targetId = findNeighbor(players, current.id, direction).id
  }
  const updated = players.map((player) => player.id === targetId
    ? { ...player, score: Math.max(0, player.score - outcome.points) }
    : player)
  return { players: updated, outcome, targetId }
}
