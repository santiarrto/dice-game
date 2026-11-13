import { useState, type FormEvent } from 'react'
import { avatarImage } from '../../assets/avatars'
import { AVATAR_IDS, DEFAULT_AVATAR_ID } from '../../domain/avatars'
import { isAiDifficulty, type AiDifficulty, type PlayerSetup } from '../../domain/game'

export type GameSetup = {
  players: PlayerSetup[]
  initialScore: number
  order: 'random' | 'manual'
}

type PlayerDraft = PlayerSetup & {
  id: string
  difficulty: AiDifficulty
}

type SetupFormProps = {
  onStart?: (setup: GameSetup) => void
}

const MIN_PLAYERS = 2
const MAX_PLAYERS = 8
const MIN_SCORE = 10
const MAX_SCORE = 50

export function SetupForm({ onStart }: SetupFormProps) {
  const [playerCount, setPlayerCount] = useState(MIN_PLAYERS)
  const [players, setPlayers] = useState<PlayerDraft[]>([
    { id: 'player-1', name: '', avatarId: DEFAULT_AVATAR_ID, kind: 'human', difficulty: 'medium' },
    { id: 'player-2', name: '', avatarId: DEFAULT_AVATAR_ID, kind: 'human', difficulty: 'medium' },
  ])
  const [nextPlayerId, setNextPlayerId] = useState(3)
  const [initialScore, setInitialScore] = useState('20')
  const [turnOrder, setTurnOrder] = useState<'random' | 'manual'>('random')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const activePlayers = players.slice(0, playerCount)

  function updatePlayerCount(count: number) {
    setPlayerCount(count)
    setNotice('')
    setFormError('')

    if (count <= players.length) {
      return
    }

    const additionalPlayers = Array.from(
      { length: count - players.length },
      (_, index) => ({
        id: `player-${nextPlayerId + index}`,
        name: '',
        avatarId: DEFAULT_AVATAR_ID,
        kind: 'human' as const,
        difficulty: 'medium' as const,
      }),
    )
    setNextPlayerId(nextPlayerId + additionalPlayers.length)
    setPlayers([...players, ...additionalPlayers])
  }

  function updatePlayer(id: string, changes: Partial<PlayerSetup>) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === id ? { ...player, ...changes } : player)),
    )
    setNotice('')
    setFormError('')
  }

  function movePlayer(index: number, offset: -1 | 1) {
    setPlayers((currentPlayers) => {
      const nextIndex = index + offset
      if (nextIndex < 0 || nextIndex >= playerCount) return currentPlayers

      const reordered = [...currentPlayers]
      const player = reordered[index]
      reordered[index] = reordered[nextIndex]
      reordered[nextIndex] = player
      return reordered
    })
    setNotice('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')

    const score = Number(initialScore)
    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
      setFormError('El marcador debe ser un número entero entre 10 y 50.')
      return
    }

    setFormError('')
    const setup: GameSetup = {
      players: activePlayers.map((player, index) => ({
        name: player.name.trim() || `Jugador ${index + 1}`,
        avatarId: player.avatarId,
        kind: player.kind,
        ...(player.kind === 'ai' ? { difficulty: player.difficulty } : {}),
      })),
      initialScore: score,
      order: turnOrder,
    }

    if (onStart) {
      onStart(setup)
      return
    }

    setNotice('Configuración validada. Aún no se puede jugar: falta integrar la partida y el historial.')
  }

  return (
    <form className="setup-form" noValidate onSubmit={handleSubmit}>
      <section className="setup-section" aria-labelledby="players-heading">
        <div className="setup-section__heading">
          <div>
            <p className="section-kicker">01 · Participantes</p>
            <h2 id="players-heading">¿Quiénes juegan?</h2>
          </div>
          <label className="field field--count">
            <span>Jugadores</span>
            <select
              aria-label="Cantidad de jugadores"
              value={playerCount}
              onChange={(event) => updatePlayerCount(Number(event.target.value))}
            >
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => (
                <option key={index + MIN_PLAYERS} value={index + MIN_PLAYERS}>
                  {index + MIN_PLAYERS}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="player-fields">
          {activePlayers.map((player, index) => (
            <div className="player-setup" key={player.id}>
              <label className="field">
                <span>Nombre del jugador {index + 1} <span className="optional">(opcional)</span></span>
                <input
                  autoComplete="off"
                  maxLength={40}
                  name={player.id}
                  onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
                  placeholder={`Jugador ${index + 1}`}
                  type="text"
                  value={player.name}
                />
              </label>
              <label className="field">
                <span>Tipo de jugador {index + 1}</span>
                <select
                  value={player.kind}
                  onChange={(event) => {
                    const kind: string = event.target.value
                    if (kind !== 'human' && kind !== 'ai') throw new Error('El tipo de jugador no es válido.')
                    updatePlayer(player.id, { kind })
                  }}
                >
                  <option value="human">Persona</option>
                  <option value="ai">IA</option>
                </select>
              </label>
              {player.kind === 'ai' && (
                <label className="field">
                  <span>Dificultad de IA del jugador {index + 1}</span>
                  <select
                    value={player.difficulty}
                    onChange={(event) => {
                      const difficulty: string = event.target.value
                      if (!isAiDifficulty(difficulty)) throw new Error('La dificultad de IA no es válida.')
                      updatePlayer(player.id, { difficulty })
                    }}
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Media</option>
                    <option value="hard">Difícil</option>
                  </select>
                </label>
              )}
              <details className="avatar-picker">
                <summary>
                  <img src={avatarImage(player.avatarId)} alt="" />
                  <span>Avatar del jugador {index + 1}: {AVATAR_IDS.indexOf(player.avatarId) + 1}</span>
                </summary>
                <fieldset className="avatar-picker__options">
                  <legend>Elige el avatar del jugador {index + 1}</legend>
                  {AVATAR_IDS.map((avatarId, avatarIndex) => (
                    <label className="avatar-picker__option" key={avatarId}>
                      <input
                        aria-label={`Avatar ${avatarIndex + 1} del jugador ${index + 1}`}
                        checked={player.avatarId === avatarId}
                        name={`avatar-${player.id}`}
                        onChange={() => updatePlayer(player.id, { avatarId })}
                        type="radio"
                        value={avatarId}
                      />
                      <img src={avatarImage(avatarId)} alt="" loading="lazy" />
                      <span>{avatarIndex + 1}</span>
                    </label>
                  ))}
                </fieldset>
              </details>
            </div>
          ))}
        </div>
      </section>

      <div className="setup-options">
        <section className="setup-section setup-section--score" aria-labelledby="score-heading">
          <p className="section-kicker">02 · Marcador</p>
          <h2 id="score-heading">Puntos iniciales</h2>
          <label className="field">
            <span>Marcador por jugador</span>
            <input
              aria-describedby={formError ? 'score-error' : 'score-help'}
              aria-invalid={Boolean(formError)}
              max={MAX_SCORE}
              min={MIN_SCORE}
              onChange={(event) => {
                setInitialScore(event.target.value)
                setFormError('')
                setNotice('')
              }}
              type="number"
              value={initialScore}
            />
          </label>
          {formError ? (
            <p className="field-error" id="score-error" role="alert">{formError}</p>
          ) : (
            <p className="field-help" id="score-help">Elige un entero entre 10 y 50. Predeterminado: 20.</p>
          )}
        </section>

        <section className="setup-section setup-section--order" aria-labelledby="order-heading">
          <p className="section-kicker">03 · Orden de turnos</p>
          <h2 id="order-heading">¿Quién empieza?</h2>
          <fieldset className="order-options">
            <legend className="visually-hidden">Cómo decidir el orden</legend>
            <label className="choice">
              <input
                checked={turnOrder === 'random'}
                name="turn-order"
                onChange={() => {
                  setTurnOrder('random')
                  setNotice('')
                }}
                type="radio"
                value="random"
              />
              <span>
                <strong>Al azar</strong>
                <small>Sorteamos el orden al comenzar.</small>
              </span>
            </label>
            <label className="choice">
              <input
                checked={turnOrder === 'manual'}
                name="turn-order"
                onChange={() => {
                  setTurnOrder('manual')
                  setNotice('')
                }}
                type="radio"
                value="manual"
              />
              <span>
                <strong>Elegir manualmente</strong>
                <small>Organiza la lista con los controles de orden.</small>
              </span>
            </label>
          </fieldset>

          {turnOrder === 'manual' && (
            <ol className="order-list" aria-label="Orden de los turnos">
              {activePlayers.map((player, index) => {
                const playerName = player.name.trim() || `Jugador ${index + 1}`
                return (
                  <li className="order-list__item" key={player.id}>
                    <span className="order-list__position">{index + 1}</span>
                    <span className="order-list__name">{playerName}</span>
                    <div className="order-list__controls">
                      <button
                        aria-label={`Subir ${playerName}`}
                        disabled={index === 0}
                        onClick={() => movePlayer(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Bajar ${playerName}`}
                        disabled={index === activePlayers.length - 1}
                        onClick={() => movePlayer(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="setup-submit">
        {notice && <p className="setup-notice" role="status">{notice}</p>}
        <button className="start-button" type="submit">Comenzar partida</button>
      </div>
    </form>
  )
}
