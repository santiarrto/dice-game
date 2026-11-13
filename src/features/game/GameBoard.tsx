import { useEffect, useState } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { selectedTotal, type DieValue, type Direction, type Game, type GameSummary, type Player } from '../../domain/game'
import { HistoryError, saveHistory } from '../../persistence/history'
import { useLanguage } from '../../i18n'
import { playAiStep } from './ai'
import {
  advanceTurn,
  attackTargets,
  chooseAttack,
  nextPlayer,
  rollGameDice,
  selectGameDice,
  startGame,
  type GameFlow,
} from './gameFlow'

interface GameBoardProps {
  game: Game
  onReturn: () => void
}

const pipPositions: Record<DieValue, readonly number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

function playerById(players: readonly Player[], id: string): Player {
  const player = players.find((item) => item.id === id)
  if (!player) throw new Error('No se encontró el jugador de la partida.')
  return player
}

function aiLabel(player: Player, t: ReturnType<typeof useLanguage>['t'], language: string): string {
  if (player.difficulty === undefined) throw new Error('Falta la dificultad del jugador de IA.')
  return `${t.ai} (${t.difficulties[player.difficulty].toLocaleLowerCase(language)})`
}

function turnMessage(flow: GameFlow, t: ReturnType<typeof useLanguage>['t']): string {
  if (flow.phase === 'playing') {
    return flow.game.turn.phase === 'ready'
      ? t.rollHelp
      : t.selectHelp
  }
  if (flow.phase === 'choose-target') {
    return t.chooseTargetMessage(flow.total, flow.points)
  }

  const { result, game } = flow
  if (result.outcome.kind === 'neutral') {
    return t.neutralMessage(result.total)
  }
  if (result.targetId === null) throw new Error('Falta el objetivo del resultado.')
  const target = playerById(game.players, result.targetId)
  const eliminated = target.score === 0 ? t.eliminationMessage(target.name) : ''
  if (result.outcome.kind === 'loss') {
    return t.lossMessage(result.total, result.outcome.points, target.name) + eliminated
  }
  return t.attackMessage(result.total, result.outcome.points, target.name) + eliminated
}

export function GameBoard({ game, onReturn }: GameBoardProps) {
  const { language, t } = useLanguage()
  const [flow, setFlow] = useState(() => startGame(game))
  const [selection, setSelection] = useState<number[]>([])
  const [lastRoll, setLastRoll] = useState<number[]>([])
  const [attackDirection, setAttackDirection] = useState<Direction | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [saveError, setSaveError] = useState<HistoryError | null>(null)

  const { turn, players, currentPlayerId, lastPlayerId } = flow.game
  const current = playerById(players, currentPlayerId)
  const isAiTurn = current.kind === 'ai'
  const upcoming = nextPlayer(flow)
  const choosingDice = !isAiTurn && flow.phase === 'playing' && turn.phase === 'selecting'
  const canRoll = !isAiTurn && flow.phase === 'playing' && turn.phase === 'ready'
  const selectedSum = turn.dice.reduce((sum, die) => {
    if (!selection.includes(die.id)) return sum
    if (die.value === null || die.locked) throw new Error('La selección de dados no es válida.')
    return sum + die.value
  }, selectedTotal(turn))
  const turnNumber = flow.phase === 'turn-complete' || flow.phase === 'finished'
    ? flow.game.turnCount
    : flow.game.turnCount + 1
  const affectedPlayerId = flow.phase === 'turn-complete' || flow.phase === 'finished'
    ? flow.result.targetId
    : null

  function updateFlow(next: GameFlow) {
    if (next.phase === 'finished') {
      const summary: GameSummary = {
        id: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(''),
        finishedAt: new Date().toISOString(),
        initialScore: next.game.initialScore,
        players: next.game.players,
        winnerId: next.winnerId,
        turnCount: next.game.turnCount,
        ranking: next.ranking,
      }
      try {
        saveHistory(summary)
      } catch (error) {
        if (!(error instanceof HistoryError)) throw error
        setSaveError(error)
      }
    }
    setFlow(next)
  }

  function roll() {
    setLastRoll(turn.dice.filter((die) => !die.locked).map((die) => die.id))
    setSelection([])
    updateFlow(rollGameDice(flow))
  }

  function keepSelected() {
    updateFlow(selectGameDice(flow, selection))
    setSelection([])
  }

  function advance() {
    setFlow(advanceTurn(flow))
    setSelection([])
    setLastRoll([])
    setAttackDirection(null)
  }

  function requestExit() {
    if (flow.game.turnCount === 0 && turn.rollCount === 0) {
      onReturn()
    } else {
      setConfirmExit(true)
    }
  }

  useEffect(() => {
    if (!isAiTurn || flow.phase === 'finished' || confirmExit) return
    const timer = window.setTimeout(() => {
      if (flow.phase === 'playing' && flow.game.turn.phase === 'ready') {
        setLastRoll(flow.game.turn.dice.filter((die) => !die.locked).map((die) => die.id))
      }
      if (flow.phase === 'turn-complete') {
        setLastRoll([])
        setAttackDirection(null)
      }
      setSelection([])
      updateFlow(playAiStep(flow))
    }, flow.phase === 'turn-complete' ? 1400 : 650)
    return () => window.clearTimeout(timer)
  }, [flow, isAiTurn, confirmExit])

  if (flow.phase === 'finished') {
    return (
      <section className="game-panel game-summary" aria-labelledby="summary-heading">
        <p className="section-kicker">{t.finished}</p>
        <h2 id="summary-heading">{t.congratulations}</h2>
        <p className="game-winner" role="status">🏆 {t.winner} {playerById(players, flow.winnerId).name}</p>
        <p>{turnMessage(flow, t)}</p>
        <p>{t.initialScore} <strong>{flow.game.initialScore} {t.points}</strong></p>
        <p>{t.turnsPlayed} <strong>{flow.game.turnCount}</strong></p>
        <h3>{t.finalRanking}</h3>
        <ol className="scoreboard">
          {flow.ranking.map((id, index) => {
            const player = playerById(players, id)
            return (
              <li className="scoreboard__player" key={player.id}>
                <div className="scoreboard__name">
                  <div className="scoreboard__identity">
                    <span>{index + 1}.</span>
                    <PlayerAvatar avatarId={player.avatarId} />
                    <strong>{player.name}</strong>
                  </div>
                  <span>{player.score} {t.points}</span>
                </div>
                <div className="scoreboard__tags">
                  <span>{player.id === flow.winnerId ? t.winnerLabel : t.eliminated}</span>
                </div>
              </li>
            )
          })}
        </ol>
        {saveError ? (
          <p role="alert">{t.historyErrors[saveError.code]} {t.notSaved}</p>
        ) : (
          <p>{t.saved}</p>
        )}
        <button className="start-button" onClick={onReturn} type="button">{t.newGame}</button>
      </section>
    )
  }

  return (
    <div className="game-layout">
      <section className="game-panel" aria-labelledby="game-heading">
        <p className="section-kicker">{t.turn} {turnNumber}</p>
        <h2 id="game-heading">{t.board}</h2>
        <p className="game-current">{t.currentPlayer} <strong>{current.name}</strong></p>
        {isAiTurn && <p>{t.aiAutomatic}</p>}
        <p>{t.rollCount} <strong>{turn.rollCount} {t.of} 5</strong></p>

        <div className="game-dice" role="group" aria-label={t.dice}>
          {turn.dice.map((die) => {
            const chosen = selection.includes(die.id)
            const rolledLast = lastRoll.includes(die.id)
            const state = die.locked ? t.dieLocked : chosen ? t.dieSelected : t.dieAvailable
            const label = die.value === null ? t.dieUnrolled : `${t.dieValue} ${die.value}, ${state}`
            const displayState = die.value === null ? t.dieUnrolled : state
            return (
              <button
                aria-label={`${t.die} ${die.id + 1}: ${label}${rolledLast ? `, ${t.lastRoll}` : ''}`}
                aria-pressed={die.locked || chosen}
                className={`game-die${die.locked ? ' game-die--locked' : ''}${chosen ? ' game-die--selected' : ''}${rolledLast ? ' game-die--last' : ''}`}
                disabled={!choosingDice || die.locked}
                key={die.id}
                onClick={() => setSelection((selected) => selected.includes(die.id)
                  ? selected.filter((id) => id !== die.id)
                  : [...selected, die.id])}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`game-die__cube${rolledLast ? ' game-die__cube--rolling' : ''}`}
                  data-value={die.value ?? 0}
                  key={rolledLast ? `${turn.rollCount}-${die.id}` : `idle-${die.id}`}
                >
                  {([1, 2, 3, 4, 5, 6] as const).map((value) => (
                    <span className={`game-die__side game-die__side--${value}`} key={value}>
                      {pipPositions[value].map((pip) => (
                        <span
                          className="game-die__pip"
                          key={pip}
                          style={{
                            gridArea: `${Math.ceil(pip / 3)} / ${((pip - 1) % 3) + 1}`,
                          }}
                        />
                      ))}
                    </span>
                  ))}
                </span>
                <span className="game-die__state">{displayState[0].toLocaleUpperCase(language) + displayState.slice(1)}</span>
                {rolledLast && <span className="game-die__state">{t.lastRoll[0].toLocaleUpperCase(language) + t.lastRoll.slice(1)}</span>}
              </button>
            )
          })}
        </div>

        <p className="game-total">{t.selectedTotal} <strong>{selectedSum}</strong></p>
        <p className="game-help">{t.selectedHelp}</p>
        <p aria-atomic="true" aria-live="polite" className="game-message">
          {isAiTurn && flow.phase === 'playing'
            ? turn.phase === 'ready' ? t.aiRolling : t.aiSelecting
            : isAiTurn && flow.phase === 'choose-target'
              ? t.aiTarget(flow.total)
              : turnMessage(flow, t)}
        </p>
        {turn.rollCount === 5 && flow.phase !== 'playing' && (
          <p>{t.fifthRoll}</p>
        )}

        {flow.phase === 'playing' && (
          <div className="game-actions">
            <button className="start-button" disabled={!canRoll} onClick={roll} type="button">
              {t.rollDice}
            </button>
            <button className="game-secondary" disabled={!choosingDice || selection.length === 0} onClick={keepSelected} type="button">
              {t.keepDice}
            </button>
          </div>
        )}
        {flow.phase === 'choose-target' && (
          <div>
            <fieldset className="attack-options">
              <legend>{t.attackTarget}</legend>
              <label>
                <input checked={attackDirection === 'previous'} disabled={isAiTurn} name="attack-direction" onChange={() => setAttackDirection('previous')} type="radio" />
                {t.previous} {attackTargets(flow).previous.name}
              </label>
              <label>
                <input checked={attackDirection === 'next'} disabled={isAiTurn} name="attack-direction" onChange={() => setAttackDirection('next')} type="radio" />
                {t.next} {attackTargets(flow).next.name}
              </label>
            </fieldset>
            <button
              className="start-button"
              disabled={isAiTurn || attackDirection === null}
              onClick={() => {
                if (attackDirection === null) throw new Error('Selecciona el objetivo del ataque.')
                updateFlow(chooseAttack(flow, attackDirection))
              }}
              type="button"
            >
              {t.confirmAttack}
            </button>
          </div>
        )}
        {flow.phase === 'turn-complete' && (
          <button className="start-button" disabled={isAiTurn} onClick={advance} type="button">{t.nextTurn}</button>
        )}
        <div className="game-exit">
          {confirmExit ? (
            <div role="group" aria-label={t.confirmExit}>
              <p>{t.exitWarning}</p>
              <div className="game-actions">
                <button className="game-secondary" onClick={() => setConfirmExit(false)} type="button">{t.keepPlaying}</button>
                <button className="game-secondary" onClick={onReturn} type="button">{t.confirmExit}</button>
              </div>
            </div>
          ) : (
            <button className="game-link" onClick={requestExit} type="button">{t.backToSetup}</button>
          )}
        </div>
      </section>

      <aside className="game-panel" aria-labelledby="scoreboard-heading">
        <p className="section-kicker">{t.turnOrder}</p>
        <h2 id="scoreboard-heading">{t.players}</h2>
        <ol className="scoreboard">
          {players.map((player) => (
            <li
              className={`scoreboard__player${player.score === 0 ? ' scoreboard__player--eliminated' : ''}${player.id === affectedPlayerId ? ' scoreboard__player--affected' : ''}`}
              key={player.id}
            >
              <div className="scoreboard__name">
                <strong>{player.name}</strong>
                <span>{player.score} {t.points}</span>
              </div>
              <div className="scoreboard__tags">
                {player.kind === 'ai' && (
                  <span>{aiLabel(player, t, language)}</span>
                )}
                {player.id === currentPlayerId && <span>{t.current}</span>}
                {player.id === upcoming?.id && <span>{t.nextPlayer}</span>}
                {player.id === lastPlayerId && <span>{t.lastPlayer}</span>}
                {player.score === 0 && <span>{t.eliminated}</span>}
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
