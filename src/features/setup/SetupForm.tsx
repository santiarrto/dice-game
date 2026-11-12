import { useState, type FormEvent } from 'react'

export type GameSetup = {
  names: string[]
  initialScore: number
  order: 'random' | 'manual'
}

type PlayerDraft = {
  id: string
  name: string
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
    { id: 'player-1', name: '' },
    { id: 'player-2', name: '' },
  ])
  const [nextPlayerId, setNextPlayerId] = useState(3)
  const [initialScore, setInitialScore] = useState('20')
  const [turnOrder, setTurnOrder] = useState<'random' | 'manual'>('random')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  function updatePlayerCount(count: number) {
    setPlayerCount(count)
    setNotice('')
    setFormError('')

    if (count <= players.length) {
      setPlayers(players.slice(0, count))
      return
    }

    const additionalPlayers = Array.from(
      { length: count - players.length },
      (_, index) => ({
        id: `player-${nextPlayerId + index}`,
        name: '',
      }),
    )
    setNextPlayerId(nextPlayerId + additionalPlayers.length)
    setPlayers([...players, ...additionalPlayers])
  }

  function updatePlayerName(id: string, name: string) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === id ? { ...player, name } : player)),
    )
    setNotice('')
    setFormError('')
  }

  function movePlayer(index: number, offset: -1 | 1) {
    setPlayers((currentPlayers) => {
      const nextIndex = index + offset
      if (nextIndex < 0 || nextIndex >= currentPlayers.length) return currentPlayers

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
      names: players.map((player, index) => player.name.trim() || `Jugador ${index + 1}`),
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
          {players.map((player, index) => (
            <label className="field" key={player.id}>
              <span>Nombre del jugador {index + 1} <span className="optional">(opcional)</span></span>
              <input
                autoComplete="off"
                maxLength={40}
                name={player.id}
                onChange={(event) => updatePlayerName(player.id, event.target.value)}
                placeholder={`Jugador ${index + 1}`}
                type="text"
                value={player.name}
              />
            </label>
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
              {players.map((player, index) => {
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
                        disabled={index === players.length - 1}
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
