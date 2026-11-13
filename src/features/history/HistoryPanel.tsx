import { useState } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import type { GameSummary } from '../../domain/game'
import { HistoryError, loadHistory } from '../../persistence/history'

type HistoryState =
  | { matches: GameSummary[]; error: null }
  | { matches: null; error: string }

function readHistory(): HistoryState {
  try {
    return { matches: loadHistory(), error: null }
  } catch (error) {
    if (!(error instanceof HistoryError)) throw error
    return { matches: null, error: error.message }
  }
}

export function HistoryPanel() {
  const [history] = useState(readHistory)

  return (
    <section className="history-panel" aria-labelledby="history-heading">
      <p className="section-kicker">Partidas recientes</p>
      <h2 id="history-heading">Historial</h2>
      {history.matches === null ? (
        <p role="alert">{history.error} Puedes seguir configurando una partida.</p>
      ) : history.matches.length === 0 ? (
        <p>Aún no hay partidas terminadas en este navegador.</p>
      ) : (
        <ol className="history-list">
          {history.matches.map((match) => {
            const winningPlayer = match.players.find((player) => player.id === match.winnerId)
            if (!winningPlayer) throw new Error('El historial no tiene un ganador válido.')
            return (
              <li className="history-item" key={match.id}>
                <p><strong>Ganador:</strong> {winningPlayer.name}</p>
                <p>
                  <time dateTime={match.finishedAt}>
                    {new Date(match.finishedAt).toLocaleString('es')}
                  </time>
                  {' · '}{match.turnCount} turnos · Marcador inicial: {match.initialScore}
                </p>
                <ul>
                  {match.players.map((player) => (
                    <li className="history-item__player" key={player.id}>
                      <PlayerAvatar avatarId={player.avatarId} />
                      <span>{player.name}: {player.score} puntos</span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      )}
      <p className="history-hint">Se guardan hasta 10 partidas en este navegador.</p>
    </section>
  )
}
