import { useState } from 'react'
import { createGame, type Game } from '../domain/game'
import { GameBoard } from '../features/game/GameBoard'
import { HistoryPanel } from '../features/history/HistoryPanel'
import { SetupForm } from '../features/setup/SetupForm'

export function App() {
  const [game, setGame] = useState<Game | null>(null)

  return (
    <main className="welcome">
      <header className="welcome__header">
        <span className="welcome__icon" aria-hidden="true">🎲</span>
        <p className="welcome__eyebrow">Juego de dados</p>
        <h1>Sobrevivir</h1>
        <p>{game ? 'Lanza los dados y lucha por sobrevivir.' : 'Prepara la partida y decide quién va primero.'}</p>
      </header>
      <div hidden={game !== null}>
        <SetupForm onStart={({ names, initialScore, order }) => {
          setGame(createGame(names, initialScore, order))
        }} />
        {game === null && <HistoryPanel />}
      </div>
      {game && <GameBoard game={game} onReturn={() => setGame(null)} />}
    </main>
  )
}
