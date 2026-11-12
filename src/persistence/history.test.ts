import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '../domain/game'
import { HISTORY_KEY, HistoryError, loadHistory, saveHistory } from './history'

function summary(index: number): GameSummary {
  return {
    id: `match-${index}`,
    finishedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    initialScore: 20,
    players: [
      { id: 'player-1', name: 'Ana', score: 8 },
      { id: 'player-2', name: 'Luis', score: 0 },
    ],
    winnerId: 'player-1',
    turnCount: 4,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('historial local', () => {
  it('conserva las diez partidas más recientes y las recupera en orden', () => {
    expect(loadHistory()).toEqual([])
    for (let index = 0; index < 11; index++) saveHistory(summary(index))

    const history = loadHistory()
    expect(history).toHaveLength(10)
    expect(history.map((match) => match.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `match-${10 - index}`),
    )
    expect(history[0]).toEqual(summary(10))
  })

  it('evita guardar dos veces la misma partida y rechaza conflictos de id', () => {
    const match = summary(1)
    saveHistory(match)
    saveHistory({ ...match, players: match.players.map(({ name, id, score }) => ({ name, id, score })) })
    expect(loadHistory()).toHaveLength(1)
    expect(() => saveHistory({ ...match, turnCount: 5 })).toThrow(HistoryError)
    expect(loadHistory()).toEqual([match])
  })

  it('guarda únicamente los campos del resumen', () => {
    const match = { ...summary(1), unrelated: 'dato ajeno' }
    saveHistory(match)
    expect(localStorage.getItem(HISTORY_KEY)).not.toContain('dato ajeno')
    expect(loadHistory()).toEqual([summary(1)])
  })

  it('rechaza resúmenes sin ganador único y conserva los datos existentes', () => {
    saveHistory(summary(1))
    const invalid = { ...summary(2), winnerId: 'player-2' }
    expect(() => saveHistory(invalid)).toThrow('resumen de partida inválido')
    const unfinished = { ...summary(3), players: [
      { id: 'player-1', name: 'Ana', score: 8 },
      { id: 'player-2', name: 'Luis', score: 1 },
    ] }
    expect(() => saveHistory(unfinished)).toThrow('resumen de partida inválido')
    expect(loadHistory()).toEqual([summary(1)])
  })

  it('reporta datos corruptos o versiones incompatibles sin sobrescribirlos', () => {
    localStorage.setItem(HISTORY_KEY, '{')
    expect(() => loadHistory()).toThrow('datos inválidos')
    expect(() => saveHistory(summary(1))).toThrow('datos inválidos')
    expect(localStorage.getItem(HISTORY_KEY)).toBe('{')

    const unsupported = JSON.stringify({ version: 0, matches: [] })
    localStorage.setItem(HISTORY_KEY, unsupported)
    expect(() => loadHistory()).toThrow('no es compatible')
    expect(() => saveHistory(summary(1))).toThrow('no es compatible')
    expect(localStorage.getItem(HISTORY_KEY)).toBe(unsupported)

    localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, matches: [{ id: 'invalid' }] }))
    expect(() => loadHistory()).toThrow('datos inválidos')
  })

  it('informa si el navegador impide leer o guardar', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })
    expect(() => loadHistory()).toThrow('No se pudo leer')
    read.mockRestore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    expect(() => saveHistory(summary(1))).toThrow('No se pudo guardar')
  })
})
