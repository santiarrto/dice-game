import { describe, expect, it } from 'vitest'
import {
  applyOutcome,
  calculateOutcome,
  createGame,
  createTurn,
  findNeighbor,
  rollDice,
  selectDice,
  selectedTotal,
  turnTotal,
  winner,
} from './game'

describe('configuración de la partida', () => {
  it('valida participantes y marcador, y permite los límites', () => {
    expect(createGame(['Ana', ''], 10, 'manual').players).toEqual([
      { id: 'player-1', name: 'Ana', score: 10, avatarId: 'player1', kind: 'human' },
      { id: 'player-2', name: 'Jugador 2', score: 10, avatarId: 'player1', kind: 'human' },
    ])
    expect(createGame(Array(8).fill('Ana'), 50, 'manual').players).toHaveLength(8)
    expect(createGame(['Ana', 'Luis'], undefined, 'manual').initialScore).toBe(20)
    expect(() => createGame(['Ana'], 20, 'manual')).toThrow()
    expect(() => createGame(Array(9).fill('Ana'), 20, 'manual')).toThrow()
    for (const score of [9, 51, 10.5, NaN]) {
      expect(() => createGame(['Ana', 'Luis'], score, 'manual')).toThrow()
    }
  })

  it('conserva el orden manual y permite probar el sorteo', () => {
    const manual = createGame(['Ana', 'Luis', 'Eva'], 20, 'manual')
    const random = createGame(['Ana', 'Luis', 'Eva'], 20, 'random', () => 0)
    expect(manual.players.map((player) => player.name)).toEqual(['Ana', 'Luis', 'Eva'])
    expect(random.players.map((player) => player.name)).toEqual(['Luis', 'Eva', 'Ana'])
    expect(random.currentPlayerId).toBe(random.players[0].id)
    expect(() => createGame(['Ana', 'Luis'], 20, 'random', () => 1)).toThrow()
  })

  it('conserva los avatares y tipos al sortear y rechaza configuraciones inválidas', () => {
    const participants = [
      { name: 'Ana', avatarId: 'player20' as const, kind: 'ai' as const, difficulty: 'hard' as const },
      { name: 'Luis', avatarId: 'player2' as const, kind: 'human' as const },
    ]
    const game = createGame(participants, 20, 'random', () => 0)
    expect(game.players).toMatchObject([participants[1], participants[0]])

    const invalid = { ...participants[0] }
    Reflect.set(invalid, 'kind', 'invalid')
    expect(() => createGame([invalid, participants[1]], 20, 'manual')).toThrow('configuración del jugador')
    Reflect.set(invalid, 'kind', 'ai')
    Reflect.set(invalid, 'difficulty', 'invalid')
    expect(() => createGame([invalid, participants[1]], 20, 'manual')).toThrow('configuración del jugador')
    Reflect.set(invalid, 'difficulty', 'hard')
    Reflect.set(invalid, 'avatarId', 'player21')
    expect(() => createGame([invalid, participants[1]], 20, 'manual')).toThrow('configuración del jugador')
  })
})

describe('lanzamientos y selección', () => {
  it('solo vuelve a lanzar los dados no apartados', () => {
    const first = rollDice(createTurn(), () => 0)
    const selected = selectDice(first, [0, 1])
    const second = rollDice(selected, () => 0.99)
    expect(second.dice.map((die) => die.value)).toEqual([1, 1, 6, 6, 6, 6])
    expect(selectedTotal(second)).toBe(2)
    expect(first.dice.every((die) => !die.locked)).toBe(true)
    expect(() => rollDice(first)).toThrow()
    expect(() => selectDice(first, [])).toThrow()
    expect(() => selectDice(first, [0, 0])).toThrow()
    expect(() => selectDice(second, [0])).toThrow()
    expect(() => selectDice(second, [6])).toThrow()
    expect(() => turnTotal(second)).toThrow()
  })

  it('termina el turno al apartar todos los dados', () => {
    const complete = selectDice(rollDice(createTurn(), () => 0.5), [0, 1, 2, 3, 4, 5])
    expect(complete.phase).toBe('complete')
    expect(turnTotal(complete)).toBe(24)
    expect(() => rollDice(complete)).toThrow()
    expect(() => rollDice(createTurn(), () => Number.NaN)).toThrow()
    expect(() => selectDice(createTurn(), [0])).toThrow()
  })

  it('cuenta los dados restantes en el quinto lanzamiento', () => {
    let turn = createTurn()
    for (let id = 0; id < 4; id++) {
      turn = selectDice(rollDice(turn, () => 0), [id])
    }
    turn = rollDice(turn, () => 0.99)
    expect(turn.rollCount).toBe(5)
    expect(turn.phase).toBe('complete')
    expect(turnTotal(turn)).toBe(16)
    expect(() => selectDice(turn, [4])).toThrow()
    expect(() => rollDice(turn)).toThrow()
  })
})

describe('resultado y eliminación', () => {
  it('calcula pérdidas, igualdad y ataques en los límites', () => {
    expect(calculateOutcome(6)).toEqual({ kind: 'loss', points: 24 })
    expect(calculateOutcome(29)).toEqual({ kind: 'loss', points: 1 })
    expect(calculateOutcome(30)).toEqual({ kind: 'neutral', points: 0 })
    expect(calculateOutcome(31)).toEqual({ kind: 'attack', points: 1 })
    expect(calculateOutcome(36)).toEqual({ kind: 'attack', points: 6 })
    for (const total of [5, 37, 30.5, NaN]) {
      expect(() => calculateOutcome(total)).toThrow()
    }
  })

  it('encuentra al vecino activo en ambas direcciones y salta eliminados', () => {
    const players = createGame(['Ana', 'Luis', 'Eva', 'Leo'], 20, 'manual').players
      .map((player, index) => index === 1 ? { ...player, score: 0 } : player)
    expect(findNeighbor(players, 'player-1', 'next').name).toBe('Eva')
    expect(findNeighbor(players, 'player-1', 'previous').name).toBe('Leo')
    expect(findNeighbor(players, 'player-4', 'next').name).toBe('Ana')
    expect(findNeighbor(players, 'player-2', 'next').name).toBe('Eva')
  })

  it('aplica daño al objetivo elegido, limita la pérdida y detecta al ganador', () => {
    const original = createGame(['Ana', 'Luis'], 10, 'manual').players
    const loss = applyOutcome(original, 'player-1', 6)
    expect(loss.players.map((player) => player.score)).toEqual([0, 10])
    expect(winner(loss.players)?.name).toBe('Luis')
    expect(original[0].score).toBe(10)

    const attack = applyOutcome(original, 'player-1', 36, 'previous')
    expect(attack.targetId).toBe('player-2')
    expect(attack.players.map((player) => player.score)).toEqual([10, 4])
    expect(winner(attack.players)).toBeNull()
    const eliminated = applyOutcome(attack.players, 'player-1', 36, 'next')
    expect(eliminated.players.map((player) => player.score)).toEqual([10, 0])
    expect(winner(eliminated.players)?.id).toBe('player-1')
    expect(applyOutcome(original, 'player-1', 30).players).toEqual(original)
    expect(() => applyOutcome(original, 'player-1', 31)).toThrow()
    expect(() => applyOutcome(loss.players, 'player-1', 30)).toThrow()
    expect(() => applyOutcome(loss.players, 'player-2', 30)).toThrow()
    expect(applyOutcome(original, 'player-1', 20).players[0].score).toBe(0)
  })
})
