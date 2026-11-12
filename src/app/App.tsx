import { useState } from 'react'
import { createGame, type Game } from '../domain/game'
import { SetupForm } from '../features/setup/SetupForm'

export function App() {
  const [game, setGame] = useState<Game | null>(null)

  return (
    <main className="welcome">
      <header className="welcome__header">
        <span className="welcome__icon" aria-hidden="true">🎲</span>
        <p className="welcome__eyebrow">Juego de dados</p>
        <h1>Sobrevivir</h1>
        <p>Prepara la partida y decide quién va primero.</p>
      </header>
      <div hidden={game !== null}>
        <SetupForm onStart={({ names, initialScore, order }) => {
          setGame(createGame(names, initialScore, order))
        }} />
      </div>
      {game && (
        <section className="setup-form setup-section" aria-labelledby="prepared-heading">
          <h2 id="prepared-heading">Partida preparada</h2>
          <p role="status">El tablero de juego aún está en desarrollo.</p>
          <p>Marcador inicial: {game.initialScore} puntos por jugador.</p>
          <h3>Orden de turnos</h3>
          <ol>
            {game.players.map((player) => <li key={player.id}>{player.name}</li>)}
          </ol>
          <button className="start-button" type="button" onClick={() => setGame(null)}>
            Volver a configurar
          </button>
        </section>
      )}
    </main>
  )
}
