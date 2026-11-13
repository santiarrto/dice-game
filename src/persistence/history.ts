import type { GameSummary } from '../domain/game'
import { DEFAULT_AVATAR_ID, isAvatarId } from '../domain/avatars'

export const HISTORY_KEY = 'dice-game:history'
const LEGACY_HISTORY_VERSION = 1
const HISTORY_VERSION = 2
const HISTORY_LIMIT = 10

interface LegacyPlayer {
  id: string
  name: string
  score: number
}

interface LegacyGameSummary {
  id: string
  finishedAt: string
  initialScore: number
  players: LegacyPlayer[]
  winnerId: string
  turnCount: number
}

interface SummaryBase extends Record<string, unknown> {
  id: string
  finishedAt: string
  initialScore: number
  players: LegacyPlayer[]
  winnerId: string
  turnCount: number
}

interface LoadedHistory {
  matches: GameSummary[]
  needsMigration: boolean
}

export class HistoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HistoryError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLegacyPlayer(value: unknown, initialScore: number): value is LegacyPlayer {
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

function isLegacyPlayers(value: unknown[], initialScore: number): value is LegacyPlayer[] {
  return value.every((player) => isLegacyPlayer(player, initialScore))
}

function isAvatarPlayer(value: unknown, initialScore: number): value is GameSummary['players'][number] {
  return isRecord(value)
    && isLegacyPlayer(value, initialScore)
    && isAvatarId(value.avatarId)
}

function isSummaryBase(value: unknown): value is SummaryBase {
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

  if (!isLegacyPlayers(value.players, value.initialScore)) return false
  const players = value.players
  const active = players.filter((player) => player.score > 0)
  return new Set(players.map((player) => player.id)).size === players.length
    && active.length === 1
    && active[0].id === value.winnerId
}

function isLegacySummary(value: unknown): value is LegacyGameSummary {
  return isSummaryBase(value)
}

function isGameSummary(value: unknown): value is GameSummary {
  if (!isSummaryBase(value) || !value.players.every((player) =>
    isAvatarPlayer(player, value.initialScore))) {
    return false
  }
  if (value.ranking === undefined) return true
  if (!isStringArray(value.ranking) || value.ranking.length !== value.players.length) return false
  return new Set(value.ranking).size === value.players.length
    && value.ranking[0] === value.winnerId
    && value.ranking.every((id) => value.players.some((player) => player.id === id))
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')
}

function migrateSummary(summary: LegacyGameSummary): GameSummary {
  return {
    id: summary.id,
    finishedAt: summary.finishedAt,
    initialScore: summary.initialScore,
    players: summary.players.map(({ id, name, score }) => ({
      id, name, score, avatarId: DEFAULT_AVATAR_ID,
    })),
    winnerId: summary.winnerId,
    turnCount: summary.turnCount,
  }
}

function copySummary(summary: GameSummary): GameSummary {
  return {
    id: summary.id,
    finishedAt: summary.finishedAt,
    initialScore: summary.initialScore,
    players: summary.players.map(({ id, name, score, avatarId }) => ({ id, name, score, avatarId })),
    winnerId: summary.winnerId,
    turnCount: summary.turnCount,
    ...(summary.ranking === undefined ? {} : { ranking: [...summary.ranking] }),
  }
}

function sortHistory(matches: GameSummary[]): GameSummary[] {
  return matches.sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
}

function hasDuplicateIds(matches: readonly { id: string }[]): boolean {
  return new Set(matches.map((match) => match.id)).size !== matches.length
}

function browserStorage(): Storage {
  try {
    return window.localStorage
  } catch (cause) {
    throw new HistoryError('El almacenamiento local no está disponible.', { cause })
  }
}

function readHistory(storage: Storage): LoadedHistory {
  let raw: string | null
  try {
    raw = storage.getItem(HISTORY_KEY)
  } catch (cause) {
    throw new HistoryError('No se pudo leer el historial local.', { cause })
  }
  if (raw === null) return { matches: [], needsMigration: false }

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (cause) {
    throw new HistoryError('El historial guardado contiene datos inválidos.', { cause })
  }
  if (!isRecord(data) || !('version' in data)) {
    throw new HistoryError('El historial guardado contiene datos inválidos.')
  }
  if (data.version !== LEGACY_HISTORY_VERSION && data.version !== HISTORY_VERSION) {
    throw new HistoryError('La versión del historial guardado no es compatible.')
  }
  if (!Array.isArray(data.matches) || data.matches.length > HISTORY_LIMIT) {
    throw new HistoryError('El historial guardado contiene datos inválidos.')
  }
  if (data.version === LEGACY_HISTORY_VERSION) {
    if (!data.matches.every(isLegacySummary) || hasDuplicateIds(data.matches)) {
      throw new HistoryError('El historial guardado contiene datos inválidos.')
    }
    return {
      matches: sortHistory(data.matches.map(migrateSummary)),
      needsMigration: true,
    }
  }
  if (!data.matches.every(isGameSummary) || hasDuplicateIds(data.matches)) {
    throw new HistoryError('El historial guardado contiene datos inválidos.')
  }
  return { matches: sortHistory(data.matches.map(copySummary)), needsMigration: false }
}

export function loadHistory(storage: Storage = browserStorage()): GameSummary[] {
  return readHistory(storage).matches
}

function writeHistory(matches: readonly GameSummary[], storage: Storage): void {
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify({ version: HISTORY_VERSION, matches }))
  } catch (cause) {
    throw new HistoryError('No se pudo guardar el historial local.', { cause })
  }
}

export function saveHistory(summary: GameSummary, storage: Storage = browserStorage()): void {
  if (!isGameSummary(summary)) {
    throw new HistoryError('No se puede guardar un resumen de partida inválido.')
  }
  const { matches: history, needsMigration } = readHistory(storage)
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
          && player.avatarId === other.avatarId
      })
      && (existing.ranking === undefined && summary.ranking === undefined
        || existing.ranking !== undefined && summary.ranking !== undefined
        && existing.ranking.length === summary.ranking.length
        && existing.ranking.every((id, index) => id === summary.ranking?.[index]))
    if (!same) {
      throw new HistoryError('Ya existe una partida diferente con ese identificador.')
    }
    if (needsMigration) writeHistory(history, storage)
    return
  }
  const matches = sortHistory([copySummary(summary), ...history]).slice(0, HISTORY_LIMIT)
  writeHistory(matches, storage)
}
