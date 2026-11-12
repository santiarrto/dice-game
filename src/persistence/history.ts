import type { GameSummary, Player } from '../domain/game'

export const HISTORY_KEY = 'dice-game:history'
const HISTORY_VERSION = 1
const HISTORY_LIMIT = 10

export class HistoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HistoryError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlayer(value: unknown, initialScore: number): value is Player {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.trim().length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && typeof value.score === 'number'
    && Number.isInteger(value.score)
    && value.score >= 0
    && value.score <= initialScore
}

function isGameSummary(value: unknown): value is GameSummary {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || value.id.trim().length === 0
    || typeof value.finishedAt !== 'string'
    || !Number.isFinite(Date.parse(value.finishedAt))
    || new Date(value.finishedAt).toISOString() !== value.finishedAt
    || typeof value.initialScore !== 'number'
    || !Number.isInteger(value.initialScore)
    || value.initialScore < 10
    || value.initialScore > 50
    || typeof value.turnCount !== 'number'
    || !Number.isInteger(value.turnCount)
    || value.turnCount < 1
    || typeof value.winnerId !== 'string'
    || !Array.isArray(value.players)
    || value.players.length < 2
    || value.players.length > 8) {
    return false
  }

  const initialScore = value.initialScore
  if (!value.players.every((player: unknown) => isPlayer(player, initialScore))) return false
  const players: Player[] = value.players
  const active = players.filter((player) => player.score > 0)
  return new Set(players.map((player) => player.id)).size === players.length
    && active.length === 1
    && active[0].id === value.winnerId
}

function copySummary(summary: GameSummary): GameSummary {
  return {
    id: summary.id,
    finishedAt: summary.finishedAt,
    initialScore: summary.initialScore,
    players: summary.players.map(({ id, name, score }) => ({ id, name, score })),
    winnerId: summary.winnerId,
    turnCount: summary.turnCount,
  }
}

function browserStorage(): Storage {
  try {
    return window.localStorage
  } catch (cause) {
    throw new HistoryError('El almacenamiento local no está disponible.', { cause })
  }
}

export function loadHistory(storage: Storage = browserStorage()): GameSummary[] {
  let raw: string | null
  try {
    raw = storage.getItem(HISTORY_KEY)
  } catch (cause) {
    throw new HistoryError('No se pudo leer el historial local.', { cause })
  }
  if (raw === null) return []

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (cause) {
    throw new HistoryError('El historial guardado contiene datos inválidos.', { cause })
  }
  if (!isRecord(data) || !('version' in data)) {
    throw new HistoryError('El historial guardado contiene datos inválidos.')
  }
  if (data.version !== HISTORY_VERSION) {
    throw new HistoryError('La versión del historial guardado no es compatible.')
  }
  if (!Array.isArray(data.matches)
    || data.matches.length > HISTORY_LIMIT
    || !data.matches.every(isGameSummary)
    || new Set(data.matches.map((match: GameSummary) => match.id)).size !== data.matches.length) {
    throw new HistoryError('El historial guardado contiene datos inválidos.')
  }
  return data.matches.map(copySummary).sort((a: GameSummary, b: GameSummary) =>
    Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
}

export function saveHistory(summary: GameSummary, storage: Storage = browserStorage()): void {
  if (!isGameSummary(summary)) {
    throw new HistoryError('No se puede guardar un resumen de partida inválido.')
  }
  const history = loadHistory(storage)
  const existing = history.find((match) => match.id === summary.id)
  if (existing) {
    const same = existing.finishedAt === summary.finishedAt
      && existing.initialScore === summary.initialScore
      && existing.winnerId === summary.winnerId
      && existing.turnCount === summary.turnCount
      && existing.players.length === summary.players.length
      && existing.players.every((player, index) => {
        const other = summary.players[index]
        return player.id === other.id && player.name === other.name && player.score === other.score
      })
    if (!same) {
      throw new HistoryError('Ya existe una partida diferente con ese identificador.')
    }
    return
  }
  const matches = [copySummary(summary), ...history]
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
    .slice(0, HISTORY_LIMIT)
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify({ version: HISTORY_VERSION, matches }))
  } catch (cause) {
    throw new HistoryError('No se pudo guardar el historial local.', { cause })
  }
}
