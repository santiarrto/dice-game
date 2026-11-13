import {
  findNeighbor,
  selectedTotal,
  type AiDifficulty,
  type Direction,
  type Game,
  type Player,
  type RandomSource,
} from '../../domain/game'
import {
  advanceTurn,
  chooseAttack,
  confirmTurn,
  rollGameDice,
  selectGameDice,
  type GameFlow,
} from './gameFlow'

function randomIndex(length: number, random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('La fuente aleatoria debe devolver un número entre 0 y 1, sin incluir 1.')
  }
  return Math.floor(value * length)
}

function damageValue(target: Player, points: number, game: Game): number {
  const damage = Math.min(points, target.score)
  if (damage === target.score) {
    return damage + (game.players.filter((player) => player.score > 0).length === 2 ? 1000 : 20)
  }
  return damage + target.score / game.initialScore
}

function attackValue(game: Game, total: number): number {
  const next = findNeighbor(game.players, game.currentPlayerId, 'next')
  const previous = findNeighbor(game.players, game.currentPlayerId, 'previous')
  return Math.max(damageValue(next, total - 30, game), damageValue(previous, total - 30, game))
}

function evaluateTotal(total: number, game: Game, difficulty: 'medium' | 'hard'): number {
  if (difficulty === 'medium') return -Math.abs(30 - total)
  const current = game.players.find((player) => player.id === game.currentPlayerId)
  if (!current) throw new Error('No se encontró el jugador de IA.')
  if (total < 30) return -(30 - total) - (30 - total >= current.score ? 1000 : 0)
  return total > 30 ? attackValue(game, total) : 0
}

function sumDistribution(diceCount: number): number[] {
  let distribution = [1]
  for (let die = 0; die < diceCount; die++) {
    const next = Array<number>(distribution.length + 6).fill(0)
    for (let sum = 0; sum < distribution.length; sum++) {
      for (let face = 1; face <= 6; face++) next[sum + face] += distribution[sum] / 6
    }
    distribution = next
  }
  return distribution
}

export function chooseAiDice(
  game: Game,
  difficulty: AiDifficulty,
  random: RandomSource = Math.random,
): number[] {
  if (game.turn.phase !== 'selecting') throw new Error('La IA no puede seleccionar dados en este momento.')
  const available = game.turn.dice.filter((die) => !die.locked)
  if (available.length === 0 || available.some((die) => die.value === null)) {
    throw new Error('La IA necesita dados disponibles con valores válidos.')
  }
  const combinations = 2 ** available.length
  if (difficulty === 'easy') {
    const mask = randomIndex(combinations - 1, random) + 1
    return available.filter((_, index) => (mask & (1 << index)) !== 0).map((die) => die.id)
  }
  if (difficulty !== 'medium' && difficulty !== 'hard') throw new Error('La dificultad de IA no es válida.')

  const locked = selectedTotal(game.turn)
  let bestValue = -Infinity
  let bestMask = 1
  for (let mask = 1; mask < combinations; mask++) {
    let total = locked
    let remaining = 0
    for (const [index, die] of available.entries()) {
      if ((mask & (1 << index)) === 0) {
        remaining++
      } else {
        if (die.value === null) throw new Error('Falta el valor de un dado.')
        total += die.value
      }
    }
    const expectedValue = sumDistribution(remaining).reduce((sum, probability, futureTotal) =>
      probability === 0 ? sum : sum + probability * evaluateTotal(total + futureTotal, game, difficulty), 0)
    if (expectedValue > bestValue) {
      bestValue = expectedValue
      bestMask = mask
    }
  }
  return available.filter((_, index) => (bestMask & (1 << index)) !== 0).map((die) => die.id)
}

export function chooseAiDirection(
  game: Game,
  points: number,
  difficulty: AiDifficulty,
  random: RandomSource = Math.random,
): Direction {
  const next = findNeighbor(game.players, game.currentPlayerId, 'next')
  const previous = findNeighbor(game.players, game.currentPlayerId, 'previous')
  if (difficulty === 'hard') {
    return damageValue(previous, points, game) > damageValue(next, points, game) ? 'previous' : 'next'
  }
  if (difficulty !== 'easy' && difficulty !== 'medium') throw new Error('La dificultad de IA no es válida.')
  return randomIndex(2, random) === 0 ? 'next' : 'previous'
}

export function playAiStep(flow: GameFlow, random: RandomSource = Math.random): GameFlow {
  const current = flow.game.players.find((player) => player.id === flow.game.currentPlayerId)
  if (!current || current.kind !== 'ai' || current.difficulty === undefined) {
    throw new Error('El turno actual no corresponde a una IA configurada.')
  }
  if (flow.phase === 'playing') {
    return flow.game.turn.phase === 'ready'
      ? rollGameDice(flow, random)
      : selectGameDice(flow, chooseAiDice(flow.game, current.difficulty, random))
  }
  if (flow.phase === 'confirm-turn') return confirmTurn(flow)
  if (flow.phase === 'choose-target') {
    return chooseAttack(flow, chooseAiDirection(flow.game, flow.points, current.difficulty, random))
  }
  if (flow.phase === 'turn-complete') return advanceTurn(flow)
  throw new Error('La partida ya terminó.')
}
