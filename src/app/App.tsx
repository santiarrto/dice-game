import { useEffect, useState } from 'react'
import logo from '../assets/logo-128.jpg'
import { createGame, type Game } from '../domain/game'
import { GameBoard } from '../features/game/GameBoard'
import { HistoryPanel } from '../features/history/HistoryPanel'
import { SetupForm } from '../features/setup/SetupForm'
import { LANGUAGE_KEY, LanguageProvider, messages, type Language } from '../i18n'

function readLanguage(): { language: Language; error: 'read' | null } {
  let stored: string | null
  try {
    stored = window.localStorage.getItem(LANGUAGE_KEY)
  } catch {
    return { language: 'en', error: 'read' }
  }
  if (stored === null) return { language: 'en', error: null }
  try {
    const data: unknown = JSON.parse(stored)
    if (typeof data === 'object' && data !== null && !Array.isArray(data)
      && 'version' in data && data.version === 1 && 'language' in data
      && (data.language === 'en' || data.language === 'es')) {
      return { language: data.language, error: null }
    }
  } catch {
    // An invalid preference falls back to the default without changing stored data.
  }
  return { language: 'en', error: null }
}

export function App() {
  const [game, setGame] = useState<Game | null>(null)
  const [preference, setPreference] = useState<{ language: Language; error: 'read' | 'write' | null }>(readLanguage)
  const { language, error } = preference
  const t = messages[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.title
  }, [language, t.title])

  function changeLanguage(language: Language) {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, JSON.stringify({ version: 1, language }))
      setPreference({ language, error: null })
    } catch {
      setPreference({ language, error: 'write' })
    }
  }

  return (
    <LanguageProvider language={language}>
      <main className="welcome">
        <header className="welcome__header">
          <label className="language-selector">
            <span>{t.language}</span>
            <select value={language} onChange={(event) => {
              const value = event.target.value
              if (value !== 'en' && value !== 'es') throw new Error('Invalid language.')
              changeLanguage(value)
            }}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          {error && <p role="status">{error === 'read' ? t.languageReadError : t.languageWriteError}</p>}
          <img className="welcome__icon" src={logo} alt="" width="56" height="56" />
          <p className="welcome__eyebrow">{t.eyebrow}</p>
          <h1>{t.heading}</h1>
          <p>{game ? t.playing : t.welcome}</p>
        </header>
        <div hidden={game !== null}>
          <SetupForm onStart={({ players, initialScore, order }) => {
            setGame(createGame(players, initialScore, order))
          }} />
          {game === null && <HistoryPanel />}
        </div>
        {game && <GameBoard game={game} onReturn={() => setGame(null)} />}
      </main>
    </LanguageProvider>
  )
}
