import { describe, expect, it } from 'vitest'
import { createGame } from '../../domain/game'
import {
  advanceTurn,
  attackTargets,
  chooseAttack,
  confirmTurn,
  nextPlayer,
  rollGameDice,
  selectGameDice,
  startGame,
  type GameFlow,
} from './gameFlow'

const allDice = [0, 1, 2, 3, 4, 5]

function rollAndKeepAll(flow: GameFlow, randomValue: number): GameFlow {
  return selectGameDice(rollGameDice(flow, () => randomValue), allDice)
}

describe('flujo de la partida', () => {
  it('admite avatares repetidos y rechaza identificadores inválidos al iniciar', () => {
    const game = createGame(['Ana', 'Luis'], 20, 'manual')
    expect(startGame(game).game.players.map((player) => player.avatarId)).toEqual(['player1', 'player1'])

    const customized = {
      ...game,
      players: game.players.map((player) => ({ ...player, avatarId: 'player20' as const })),
    }
    const afterTurn = rollAndKeepAll(startGame(customized), 0.7)
    expect(afterTurn.game.players.map((player) => player.avatarId)).toEqual(['player20', 'player20'])

    const invalidPlayer = { ...game.players[0] }
    Reflect.set(invalidPlayer, 'avatarId', 'player21')
    expect(() => startGame({ ...game, players: [invalidPlayer, game.players[1]] }))
      .toThrow('configuración inicial')
  })

  it('valida el estado inicial y rechaza acciones fuera de orden', () => {
    const game = createGame(['Ana', 'Luis'], 20, 'manual')
    const start = startGame(game)
    expect(start.phase).toBe('playing')
    expect(nextPlayer(start)?.name).toBe('Luis')
    expect(() => startGame({ ...game, currentPlayerId: 'player-2' })).toThrow()
    expect(() => startGame({ ...game, eliminationOrder: ['player-1'] })).toThrow()
    expect(() => advanceTurn(start)).toThrow()
    expect(() => chooseAttack(start, 'next')).toThrow()
    expect(() => selectGameDice(start, [0])).toThrow()

    const rolled = rollGameDice(start, () => 0)
    expect(() => rollGameDice(rolled)).toThrow()
    expect(() => selectGameDice(rolled, [])).toThrow()
    const selected = selectGameDice(rolled, [0, 1])
    const rerolled = rollGameDice(selected, () => 0.99)
    expect(rerolled.game.turn.dice.map((die) => die.value)).toEqual([1, 1, 6, 6, 6, 6])
    expect(() => selectGameDice(rerolled, [0])).toThrow()
    expect(start.game.turn.rollCount).toBe(0)
  })

  it('resuelve automáticamente el quinto lanzamiento con los dados restantes', () => {
    let flow = startGame(createGame(['Ana', 'Luis'], 20, 'manual'))
    for (let id = 0; id < 4; id++) {
      flow = selectGameDice(rollGameDice(flow, () => 0), [id])
    }
    flow = rollGameDice(flow, () => 0.99)
    expect(flow.phase).toBe('turn-complete')
    if (flow.phase !== 'turn-complete') throw new Error('El turno debería estar resuelto.')
    expect(flow.result.total).toBe(16)
    expect(flow.result.outcome).toEqual({ kind: 'loss', points: 14 })
    expect(flow.game.players.map((player) => player.score)).toEqual([6, 20])
    expect(flow.game.lastPlayerId).toBe('player-1')
    expect(flow.game.turnCount).toBe(1)
    expect(() => rollGameDice(flow)).toThrow()
    expect(() => selectGameDice(flow, [4])).toThrow()
    expect(() => chooseAttack(flow, 'next')).toThrow()
  })

  it.each([
    [[0, 1, 2, 3], [4]],
    [[0, 1], [2, 3], [4]],
    [[0], [1], [2], [3, 4]],
  ])('aparta el único dado y espera confirmación tras las selecciones %j', (...selections: number[][]) => {
    let flow = startGame(createGame(['Ana', 'Luis'], 20, 'manual'))
    expect(() => confirmTurn(flow)).toThrow()
    for (const ids of selections) flow = selectGameDice(rollGameDice(flow, () => 0.7), ids)
    flow = rollGameDice(flow, () => 0.7)
    expect(flow.phase).toBe('confirm-turn')
    expect(flow.game.turn.rollCount).toBe(selections.length + 1)
    expect(flow.game.turn.dice.every((die) => die.locked && die.value === 5)).toBe(true)
    expect(flow.game.players.map((player) => player.score)).toEqual([20, 20])
    expect(flow.game.turnCount).toBe(0)
    expect(() => rollGameDice(flow)).toThrow()
    expect(() => selectGameDice(flow, [5])).toThrow()
    expect(() => advanceTurn(flow)).toThrow()
    flow = confirmTurn(flow)
    expect(flow.phase).toBe('turn-complete')
    if (flow.phase !== 'turn-complete') throw new Error('El turno debería estar resuelto.')
    expect(flow.result.total).toBe(30)
    expect(flow.game.turnCount).toBe(1)
    expect(() => confirmTurn(flow)).toThrow()
  })

  it('tras confirmar el último dado conserva la elección de ataque y la eliminación', () => {
    let flow = startGame(createGame(['Ana', 'Luis', 'Eva'], 10, 'manual'))
    flow = selectGameDice(rollGameDice(flow, () => 0.99), [0, 1, 2, 3, 4])
    flow = rollGameDice(flow, () => 0.99)
    expect(flow.phase).toBe('confirm-turn')
    flow = confirmTurn(flow)
    expect(flow.phase).toBe('choose-target')
    expect(attackTargets(flow).previous.name).toBe('Eva')
    expect(() => advanceTurn(flow)).toThrow()
    flow = chooseAttack(flow, 'previous')
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 10, 4])
    expect(flow.game.turnCount).toBe(1)
    flow = advanceTurn(flow)
    expect(flow.game.currentPlayerId).toBe('player-2')
    flow = selectGameDice(rollGameDice(flow, () => 0.99), [0, 1, 2, 3, 4])
    flow = confirmTurn(rollGameDice(flow, () => 0.99))
    flow = chooseAttack(flow, 'next')
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 10, 0])
    expect(flow.game.eliminationOrder).toEqual(['player-3'])
    expect(advanceTurn(flow).game.currentPlayerId).toBe('player-1')
  })

  it('aplica la eliminación propia solo al confirmar el último dado', () => {
    let flow = startGame(createGame(['Ana', 'Luis'], 10, 'manual'))
    flow = selectGameDice(rollGameDice(flow, () => 0), [0, 1, 2, 3, 4])
    flow = rollGameDice(flow, () => 0)
    expect(flow.phase).toBe('confirm-turn')
    expect(flow.game.players[0].score).toBe(10)
    flow = confirmTurn(flow)
    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.winnerId).toBe('player-2')
    expect(flow.game.players[0].score).toBe(0)
    expect(flow.game.eliminationOrder).toEqual(['player-1'])
  })

  it('espera el objetivo del ataque y salta eliminados al avanzar y atacar', () => {
    let flow = startGame(createGame(['Ana', 'Luis', 'Eva'], 10, 'manual'))
    flow = rollAndKeepAll(flow, 0.99)
    expect(flow.phase).toBe('choose-target')
    expect(attackTargets(flow).next.name).toBe('Luis')
    expect(attackTargets(flow).previous.name).toBe('Eva')
    expect(() => advanceTurn(flow)).toThrow()
    expect(() => rollGameDice(flow)).toThrow()

    flow = chooseAttack(flow, 'next')
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 4, 10])
    expect(() => chooseAttack(flow, 'next')).toThrow()
    flow = advanceTurn(flow)
    expect(flow.game.currentPlayerId).toBe('player-2')
    expect(flow.game.lastPlayerId).toBe('player-1')

    flow = rollAndKeepAll(flow, 0)
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 0, 10])
    expect(nextPlayer(flow)?.name).toBe('Eva')
    flow = advanceTurn(flow)
    expect(flow.game.currentPlayerId).toBe('player-3')
    expect(flow.game.lastPlayerId).toBe('player-2')
    expect(flow.game.turn.rollCount).toBe(0)

    flow = rollAndKeepAll(flow, 0.99)
    expect(attackTargets(flow).previous.name).toBe('Ana')
    flow = chooseAttack(flow, 'previous')
    expect(flow.game.players.map((player) => player.score)).toEqual([4, 0, 10])
    expect(nextPlayer(flow)?.name).toBe('Ana')
    expect(flow.game.turnCount).toBe(3)
  })

  it('permite jugar hasta la victoria y evita procesar el turno dos veces', () => {
    let flow = startGame(createGame(['Ana', 'Luis'], 10, 'manual'))
    flow = chooseAttack(rollAndKeepAll(flow, 0.99), 'next')
    flow = advanceTurn(flow)
    flow = rollAndKeepAll(flow, 0.7)
    expect(flow.phase).toBe('turn-complete')
    if (flow.phase !== 'turn-complete') throw new Error('El turno debería estar resuelto.')
    expect(flow.result.outcome).toEqual({ kind: 'neutral', points: 0 })
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 4])
    flow = advanceTurn(flow)
    flow = chooseAttack(rollAndKeepAll(flow, 0.99), 'previous')

    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.winnerId).toBe('player-1')
    expect(flow.result.targetId).toBe('player-2')
    expect(flow.game.players.map((player) => player.score)).toEqual([10, 0])
    expect(flow.game.lastPlayerId).toBe('player-1')
    expect(flow.game.turnCount).toBe(3)
    expect(nextPlayer(flow)).toBeNull()
    expect(() => advanceTurn(flow)).toThrow()
    expect(() => rollGameDice(flow)).toThrow()
    expect(() => chooseAttack(flow, 'previous')).toThrow()
  })

  it('declara ganador al último jugador si el jugador activo se elimina', () => {
    const flow = rollAndKeepAll(
      startGame(createGame(['Ana', 'Luis'], 10, 'manual')),
      0,
    )
    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.winnerId).toBe('player-2')
    expect(flow.result.targetId).toBe('player-1')
    expect(flow.game.players.map((player) => player.score)).toEqual([0, 10])
    expect(flow.game.turnCount).toBe(1)
    expect(nextPlayer(flow)).toBeNull()
  })

  it('registra eliminaciones por ataque y pérdida propia en orden, sin repetirlas', () => {
    let flow = startGame(createGame(['Ana', 'Luis', 'Eva', 'Sol'], 10, 'manual'))
    flow = chooseAttack(rollAndKeepAll(flow, 0.99), 'previous')
    expect(flow.game.eliminationOrder).toEqual([])
    flow = advanceTurn(flow)
    flow = rollAndKeepAll(flow, 0.8)
    expect(flow.game.eliminationOrder).toEqual([])
    flow = advanceTurn(flow)
    flow = chooseAttack(rollAndKeepAll(flow, 0.99), 'next')
    expect(flow.game.eliminationOrder).toEqual(['player-4'])
    flow = advanceTurn(flow)
    flow = rollAndKeepAll(flow, 0)
    expect(flow.game.eliminationOrder).toEqual(['player-4', 'player-1'])
    flow = advanceTurn(flow)
    flow = rollAndKeepAll(flow, 0)

    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.game.eliminationOrder).toEqual(['player-4', 'player-1', 'player-2'])
    expect(flow.ranking).toEqual(['player-3', 'player-2', 'player-1', 'player-4'])
    expect(() => advanceTurn(flow)).toThrow()
  })

  it('clasifica a ocho participantes aunque compartan el mismo nombre', () => {
    let flow = startGame(createGame(Array<string>(8).fill('Jugador'), 10, 'manual'))
    for (let turn = 0; turn < 7; turn++) {
      flow = rollAndKeepAll(flow, 0)
      if (turn < 6) flow = advanceTurn(flow)
    }
    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.ranking).toEqual(Array.from({ length: 8 }, (_, index) => `player-${8 - index}`))
  })
})
