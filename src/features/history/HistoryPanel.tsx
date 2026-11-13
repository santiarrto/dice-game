import { useState } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import type { GameSummary } from '../../domain/game'
import { HistoryError, loadHistory } from '../../persistence/history'
import { useLanguage } from '../../i18n'

type HistoryState =
  | { matches: GameSummary[]; error: null }
  | { matches: null; error: HistoryError }

function readHistory(): HistoryState {
  try {
    return { matches: loadHistory(), error: null }
  } catch (error) {
    if (!(error instanceof HistoryError)) throw error
    return { matches: null, error }
  }
}

export function HistoryPanel() {
  const { language, t } = useLanguage()
  const [history] = useState(readHistory)

  return (
    <section className="history-panel" aria-labelledby="history-heading">
      <p className="section-kicker">{t.recentGames}</p>
      <h2 id="history-heading">{t.history}</h2>
      {history.matches === null ? (
        <p role="alert">{t.historyErrors[history.error.code]} {t.historyContinue}</p>
      ) : history.matches.length === 0 ? (
        <p>{t.historyEmpty}</p>
      ) : (
        <ol className="history-list">
          {history.matches.map((match) => {
            const winningPlayer = match.players.find((player) => player.id === match.winnerId)
            if (!winningPlayer) throw new Error('El historial no tiene un ganador válido.')
            const orderedPlayers = match.ranking?.map((id) => {
              const player = match.players.find((item) => item.id === id)
              if (!player) throw new Error('La clasificación contiene un jugador desconocido.')
              return player
            }) ?? match.players
            const playerRows = orderedPlayers.map((player, index) => (
              <li className="history-item__player" key={player.id}>
                {match.ranking !== undefined && <span>{index + 1}.</span>}
                <PlayerAvatar avatarId={player.avatarId} />
                <span>{player.name}: {player.score} {t.points}</span>
              </li>
            ))
            return (
              <li className="history-item" key={match.id}>
                <p><strong>{t.historyWinner}</strong> {winningPlayer.name}</p>
                <p>
                  <time dateTime={match.finishedAt}>
                    {new Date(match.finishedAt).toLocaleString(language)}
                  </time>
                  {' · '}{match.turnCount} {t.turns} · {t.initialScore} {match.initialScore}
                </p>
                {match.ranking === undefined ? (
                  <>
                    <p>{t.rankingUnavailable}</p>
                    <ul>{playerRows}</ul>
                  </>
                ) : (
                  <>
                    <p><strong>{t.finalRanking}:</strong></p>
                    <ol className="history-item__ranking">{playerRows}</ol>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}
      <p className="history-hint">{t.historyHint}</p>
    </section>
  )
}
