import { describe, expect, it } from 'vitest'
import { createGame, rollDice, selectDice, type AiDifficulty } from '../../domain/game'
import { chooseAiDice, chooseAiDirection, playAiStep } from './ai'
import { rollGameDice, selectGameDice, startGame } from './gameFlow'

function aiGame(difficulty: AiDifficulty) {
  return createGame([
    { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty },
    { name: 'Ana', avatarId: 'player2', kind: 'human' },
  ], 10, 'manual')
}

describe('decisiones de IA', () => {
  it('elige al azar únicamente dados disponibles y rechaza azar inválido', () => {
    const game = aiGame('easy')
    const first = rollDice(game.turn, () => 0)
    const turn = rollDice(selectDice(first, [0, 1]), () => 0.99)
    const rolled = { ...game, turn }
    expect(chooseAiDice(rolled, 'easy', () => 0)).toEqual([2])
    expect(chooseAiDice(rolled, 'easy', () => 0.999)).toEqual([2, 3, 4, 5])
    expect(() => chooseAiDice(rolled, 'easy', () => 1)).toThrow('fuente aleatoria')
    expect(() => chooseAiDice(game, 'easy')).toThrow('no puede seleccionar')
  })

  it('la dificultad media conserva un resultado exacto de 30', () => {
    const game = aiGame('medium')
    const rolled = { ...game, turn: rollDice(game.turn, () => 0.7) }
    expect(chooseAiDice(rolled, 'medium')).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('la dificultad difícil aprovecha una victoria y elige objetivos eliminables', () => {
    const game = aiGame('hard')
    const rolled = {
      ...game,
      players: game.players.map((player, index) => index === 1 ? { ...player, score: 6 } : player),
      turn: rollDice(game.turn, () => 0.99),
    }
    expect(chooseAiDice(rolled, 'hard')).toEqual([0, 1, 2, 3, 4, 5])

    const four = createGame([
      { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty: 'hard' },
      'Ana', 'Eliminado', 'Luis',
    ], 10, 'manual')
    const players = four.players.map((player, index) =>
      index === 1 ? { ...player, score: 9 } : index === 2 ? { ...player, score: 0 }
        : index === 3 ? { ...player, score: 4 } : player)
    expect(chooseAiDirection({ ...four, players }, 5, 'hard')).toBe('previous')
    expect(chooseAiDirection({ ...four, players }, 5, 'easy', () => 0)).toBe('next')
    expect(chooseAiDirection({ ...four, players }, 5, 'medium', () => 0.99)).toBe('previous')
  })

  it('la dificultad difícil evita arriesgar la eliminación cuando está en desventaja', () => {
    const game = aiGame('hard')
    const rolls = [0.99, 0.99, 0.99, 0.99, 0.4, 0.4]
    let index = 0
    const turn = rollDice(game.turn, () => rolls[index++])
    const safe = { ...game, turn }
    const vulnerable = {
      ...safe,
      players: safe.players.map((player, playerIndex) => playerIndex === 0 ? { ...player, score: 1 } : player),
    }
    expect(chooseAiDice(vulnerable, 'hard')).toEqual([0, 1, 2, 3, 4, 5])
    expect(chooseAiDice(safe, 'hard')).not.toHaveLength(6)
  })

  it.each(['easy', 'medium', 'hard'] as const)('completa un turno legal en nivel %s', (difficulty) => {
    let flow = startGame(aiGame(difficulty))
    for (let step = 0; step < 12 && flow.phase !== 'finished'; step++) {
      flow = playAiStep(flow, () => 0)
    }
    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.winnerId).toBe('player-2')
    expect(flow.game.turn.rollCount).toBeLessThanOrEqual(5)
    expect(flow.game.turn.dice.every((die) => die.locked)).toBe(true)
    expect(() => playAiStep(flow, () => 0)).toThrow()
  })

  it('confirma automáticamente el último dado de la IA', () => {
    let flow = startGame(aiGame('easy'))
    flow = selectGameDice(rollGameDice(flow, () => 0), [0, 1, 2, 3, 4])
    flow = playAiStep(flow, () => 0)
    expect(flow.phase).toBe('confirm-turn')
    flow = playAiStep(flow, () => 0)
    expect(flow.phase).toBe('finished')
    if (flow.phase !== 'finished') throw new Error('La partida debería haber terminado.')
    expect(flow.winnerId).toBe('player-2')
  })

  it('rechaza ejecutar IA durante un turno humano', () => {
    expect(() => playAiStep(startGame(createGame(['Ana', 'Luis'], 20, 'manual')))).toThrow('no corresponde a una IA')
  })
})
