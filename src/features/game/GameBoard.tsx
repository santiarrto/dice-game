import { useEffect, useState } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { selectedTotal, type DieValue, type Direction, type Game, type GameSummary, type Player } from '../../domain/game'
import { HistoryError, saveHistory } from '../../persistence/history'
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

function turnMessage(flow: GameFlow): string {
  if (flow.phase === 'playing') {
    return flow.game.turn.phase === 'ready'
      ? 'Lanza los dados disponibles.'
      : 'Selecciona al menos un dado y apártalo antes de lanzar de nuevo.'
  }
  if (flow.phase === 'choose-target') {
    return `Sumaste ${flow.total}. Elige a quién atacar con ${flow.points} puntos.`
  }

  const { result, game } = flow
  if (result.outcome.kind === 'neutral') {
    return `Sumaste ${result.total}. Los marcadores no cambian.`
  }
  if (result.targetId === null) throw new Error('Falta el objetivo del resultado.')
  const target = playerById(game.players, result.targetId)
  const eliminated = target.score === 0 ? ` ${target.name} queda eliminado.` : ''
  if (result.outcome.kind === 'loss') {
    return `Sumaste ${result.total}. Se descuentan ${result.outcome.points} puntos a ${target.name} (mínimo 0).${eliminated}`
  }
  return `Sumaste ${result.total}. El ataque descuenta ${result.outcome.points} puntos a ${target.name} (mínimo 0).${eliminated}`
}

export function GameBoard({ game, onReturn }: GameBoardProps) {
  const [flow, setFlow] = useState(() => startGame(game))
  const [selection, setSelection] = useState<number[]>([])
  const [lastRoll, setLastRoll] = useState<number[]>([])
  const [attackDirection, setAttackDirection] = useState<Direction | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
      }
      try {
        saveHistory(summary)
      } catch (error) {
        if (!(error instanceof HistoryError)) throw error
        setSaveError(error.message)
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
        <p className="section-kicker">Partida terminada</p>
        <h2 id="summary-heading">¡Felicidades!</h2>
        <p className="game-winner" role="status">🏆 Ganador: {playerById(players, flow.winnerId).name}</p>
        <p>{turnMessage(flow)}</p>
        <p>Marcador inicial: <strong>{flow.game.initialScore} puntos</strong></p>
        <p>Turnos jugados: <strong>{flow.game.turnCount}</strong></p>
        <h3>Orden de juego y marcadores finales</h3>
        <ol className="scoreboard">
          {players.map((player) => (
            <li className="scoreboard__player" key={player.id}>
              <div className="scoreboard__name">
                <div className="scoreboard__identity">
                  <PlayerAvatar avatarId={player.avatarId} />
                  <strong>{player.name}</strong>
                </div>
                <span>{player.score} puntos</span>
              </div>
              <div className="scoreboard__tags">
                <span>{player.id === flow.winnerId ? 'Ganador' : 'Eliminado'}</span>
              </div>
            </li>
          ))}
        </ol>
        {saveError ? (
          <p role="alert">{saveError} El resultado no se guardó en el historial.</p>
        ) : (
          <p>Resultado guardado en el historial de este navegador.</p>
        )}
        <button className="start-button" onClick={onReturn} type="button">Nueva partida</button>
      </section>
    )
  }

  return (
    <div className="game-layout">
      <section className="game-panel" aria-labelledby="game-heading">
        <p className="section-kicker">Turno {turnNumber}</p>
        <h2 id="game-heading">Mesa de juego</h2>
        <p className="game-current">Juega: <strong>{current.name}</strong></p>
        {isAiTurn && <p>La IA juega automáticamente.</p>}
        <p>Lanzamiento: <strong>{turn.rollCount} de 5</strong></p>

        <div className="game-dice" role="group" aria-label="Dados">
          {turn.dice.map((die) => {
            const chosen = selection.includes(die.id)
            const rolledLast = lastRoll.includes(die.id)
            const state = die.locked ? 'apartado' : chosen ? 'seleccionado' : 'disponible'
            const label = die.value === null ? 'sin lanzar' : `valor ${die.value}, ${state}`
            return (
              <button
                aria-label={`Dado ${die.id + 1}: ${label}${rolledLast ? ', último lanzamiento' : ''}`}
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
                <span className="game-die__state">{die.locked ? 'Apartado' : chosen ? 'Seleccionado' : die.value === null ? 'Sin lanzar' : 'Disponible'}</span>
                {rolledLast && <span className="game-die__state">Último lanzamiento</span>}
              </button>
            )
          })}
        </div>

        <p className="game-total">Suma seleccionada: <strong>{selectedSum}</strong></p>
        <p className="game-help">Incluye los dados apartados y los seleccionados en este lanzamiento.</p>
        <p aria-atomic="true" aria-live="polite" className="game-message">
          {isAiTurn && flow.phase === 'playing'
            ? turn.phase === 'ready' ? 'La IA va a lanzar los dados.' : 'La IA está eligiendo dados.'
            : isAiTurn && flow.phase === 'choose-target'
              ? `La IA sumó ${flow.total} y está eligiendo objetivo.`
              : turnMessage(flow)}
        </p>
        {turn.rollCount === 5 && flow.phase !== 'playing' && (
          <p>Los dados del quinto lanzamiento se cuentan automáticamente.</p>
        )}

        {flow.phase === 'playing' && (
          <div className="game-actions">
            <button className="start-button" disabled={!canRoll} onClick={roll} type="button">
              Lanzar dados
            </button>
            <button className="game-secondary" disabled={!choosingDice || selection.length === 0} onClick={keepSelected} type="button">
              Apartar seleccionados
            </button>
          </div>
        )}
        {flow.phase === 'choose-target' && (
          <div>
            <fieldset className="attack-options">
              <legend>Elige el objetivo del ataque</legend>
              <label>
                <input checked={attackDirection === 'previous'} disabled={isAiTurn} name="attack-direction" onChange={() => setAttackDirection('previous')} type="radio" />
                Anterior: {attackTargets(flow).previous.name}
              </label>
              <label>
                <input checked={attackDirection === 'next'} disabled={isAiTurn} name="attack-direction" onChange={() => setAttackDirection('next')} type="radio" />
                Siguiente: {attackTargets(flow).next.name}
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
              Confirmar ataque
            </button>
          </div>
        )}
        {flow.phase === 'turn-complete' && (
          <button className="start-button" disabled={isAiTurn} onClick={advance} type="button">Siguiente turno</button>
        )}
        <div className="game-exit">
          {confirmExit ? (
            <div role="group" aria-label="Confirmar salida">
              <p>Si sales, se perderá la partida en curso.</p>
              <div className="game-actions">
                <button className="game-secondary" onClick={() => setConfirmExit(false)} type="button">Seguir jugando</button>
                <button className="game-secondary" onClick={onReturn} type="button">Confirmar salida</button>
              </div>
            </div>
          ) : (
            <button className="game-link" onClick={requestExit} type="button">Volver a configurar</button>
          )}
        </div>
      </section>

      <aside className="game-panel" aria-labelledby="scoreboard-heading">
        <p className="section-kicker">Orden de turnos</p>
        <h2 id="scoreboard-heading">Jugadores</h2>
        <ol className="scoreboard">
          {players.map((player) => (
            <li
              className={`scoreboard__player${player.score === 0 ? ' scoreboard__player--eliminated' : ''}${player.id === affectedPlayerId ? ' scoreboard__player--affected' : ''}`}
              key={player.id}
            >
              <div className="scoreboard__name">
                <strong>{player.name}</strong>
                <span>{player.score} puntos</span>
              </div>
              <div className="scoreboard__tags">
                {player.kind === 'ai' && (
                  <span>IA ({player.difficulty === 'easy' ? 'fácil' : player.difficulty === 'hard' ? 'difícil' : 'media'})</span>
                )}
                {player.id === currentPlayerId && <span>Actual</span>}
                {player.id === upcoming?.id && <span>Siguiente</span>}
                {player.id === lastPlayerId && <span>Último en jugar</span>}
                {player.score === 0 && <span>Eliminado</span>}
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
