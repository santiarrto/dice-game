import {
  applyOutcome,
  calculateOutcome,
  createTurn,
  findNeighbor,
  isAiDifficulty,
  rollDice,
  selectDice,
  turnTotal,
  winner,
  type Direction,
  type Game,
  type Player,
  type RandomSource,
  type TurnOutcome,
} from '../../domain/game'
import { isAvatarId } from '../../domain/avatars'

export interface TurnResult {
  playerId: string
  total: number
  outcome: TurnOutcome
  targetId: string | null
  direction: Direction | null
}

export type GameFlow =
  | { phase: 'playing'; game: Game }
  | { phase: 'confirm-turn'; game: Game }
  | { phase: 'choose-target'; game: Game; total: number; points: number }
  | { phase: 'turn-complete'; game: Game; result: TurnResult }
  | { phase: 'finished'; game: Game; result: TurnResult; winnerId: string; ranking: readonly string[] }

export function startGame(game: Game): GameFlow {
  const { players, turn, initialScore } = game
  if (players.length < 2 || players.length > 8
    || !Number.isInteger(initialScore) || initialScore < 10 || initialScore > 50
    || new Set(players.map((player) => player.id)).size !== players.length
    || players.some((player) => !player.id.trim() || !player.name.trim()
      || player.score !== initialScore || !isAvatarId(player.avatarId)
      || (player.kind !== 'human' && player.kind !== 'ai')
      || (player.kind === 'ai' && !isAiDifficulty(player.difficulty))
      || (player.kind === 'human' && player.difficulty !== undefined))
    || game.currentPlayerId !== players[0].id
    || game.lastPlayerId !== null || game.turnCount !== 0 || game.eliminationOrder.length !== 0
    || turn.phase !== 'ready' || turn.rollCount !== 0 || turn.dice.length !== 6
    || turn.dice.some((die, index) => die.id !== index || die.value !== null || die.locked)) {
    throw new Error('La configuración inicial de la partida no es válida.')
  }
  return { phase: 'playing', game }
}

function finishTurn(game: Game, total: number, direction?: Direction): GameFlow {
  const { players, outcome, targetId } = applyOutcome(game.players, game.currentPlayerId, total, direction)
  const eliminated = targetId !== null && players.some((player) => player.id === targetId && player.score === 0)
  const updatedGame: Game = {
    ...game,
    players,
    eliminationOrder: eliminated && targetId !== null
      ? [...game.eliminationOrder, targetId]
      : game.eliminationOrder,
    lastPlayerId: game.currentPlayerId,
    turnCount: game.turnCount + 1,
  }
  const result: TurnResult = {
    playerId: game.currentPlayerId,
    total,
    outcome,
    targetId,
    direction: direction ?? null,
  }
  const winningPlayer = winner(players)
  if (winningPlayer) {
    return {
      phase: 'finished',
      game: updatedGame,
      result,
      winnerId: winningPlayer.id,
      ranking: [winningPlayer.id, ...[...updatedGame.eliminationOrder].reverse()],
    }
  }
  return { phase: 'turn-complete', game: updatedGame, result }
}

function updateTurn(game: Game): GameFlow {
  if (game.turn.phase !== 'complete') return { phase: 'playing', game }
  const total = turnTotal(game.turn)
  const outcome = calculateOutcome(total)
  if (outcome.kind === 'attack') {
    const next = findNeighbor(game.players, game.currentPlayerId, 'next')
    const previous = findNeighbor(game.players, game.currentPlayerId, 'previous')
    if (next.id === previous.id) return finishTurn(game, total, 'next')
    return { phase: 'choose-target', game, total, points: outcome.points }
  }
  return finishTurn(game, total)
}

export function rollGameDice(flow: GameFlow, random: RandomSource = Math.random): GameFlow {
  if (flow.phase !== 'playing') throw new Error('No se puede lanzar en este momento.')
  const remaining = flow.game.turn.dice.filter((die) => !die.locked)
  let turn = rollDice(flow.game.turn, random)
  if (remaining.length === 1) {
    if (turn.phase === 'selecting') turn = selectDice(turn, [remaining[0].id])
    return { phase: 'confirm-turn', game: { ...flow.game, turn } }
  }
  return updateTurn({ ...flow.game, turn })
}

export function confirmTurn(flow: GameFlow): GameFlow {
  if (flow.phase !== 'confirm-turn') throw new Error('No hay un turno pendiente de confirmación.')
  return updateTurn(flow.game)
}

export function selectGameDice(flow: GameFlow, ids: readonly number[]): GameFlow {
  if (flow.phase !== 'playing') throw new Error('No se pueden apartar dados en este momento.')
  return updateTurn({ ...flow.game, turn: selectDice(flow.game.turn, ids) })
}

export function attackTargets(flow: GameFlow): { next: Player; previous: Player } {
  if (flow.phase !== 'choose-target') throw new Error('No hay un ataque pendiente.')
  const { players, currentPlayerId } = flow.game
  return {
    next: findNeighbor(players, currentPlayerId, 'next'),
    previous: findNeighbor(players, currentPlayerId, 'previous'),
  }
}

export function chooseAttack(flow: GameFlow, direction: Direction): GameFlow {
  if (flow.phase !== 'choose-target') throw new Error('No hay un ataque pendiente.')
  return finishTurn(flow.game, flow.total, direction)
}

export function nextPlayer(flow: GameFlow): Player | null {
  if (flow.phase === 'finished') return null
  return findNeighbor(flow.game.players, flow.game.currentPlayerId, 'next')
}

export function advanceTurn(flow: GameFlow): GameFlow {
  if (flow.phase !== 'turn-complete') throw new Error('El turno actual aún no se puede avanzar.')
  const next = findNeighbor(flow.game.players, flow.game.currentPlayerId, 'next')
  return {
    phase: 'playing',
    game: { ...flow.game, currentPlayerId: next.id, turn: createTurn() },
  }
}
