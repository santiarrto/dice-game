import { useEffect, useRef, useState } from 'react'
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
  const [page, setPage] = useState<'home' | 'contact' | 'faq'>('home')
  const infoHeading = useRef<HTMLHeadingElement>(null)
  const [preference, setPreference] = useState<{ language: Language; error: 'read' | 'write' | null }>(readLanguage)
  const { language, error } = preference
  const t = messages[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = page === 'home' ? t.title : `${page === 'contact' ? t.contact : t.faq} | ${t.title}`
  }, [language, page, t.contact, t.faq, t.title])

  useEffect(() => {
    if (page !== 'home') infoHeading.current?.focus()
  }, [page])

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
          {(game || page === 'home') && <p>{game ? t.playing : t.welcome}</p>}
        </header>
        {game === null && (
          <nav className="welcome__nav" aria-label={t.navigation}>
            <button type="button" aria-current={page === 'home' ? 'page' : undefined} onClick={() => setPage('home')}>
              {t.home}
            </button>
            <button type="button" aria-current={page === 'contact' ? 'page' : undefined} onClick={() => setPage('contact')}>
              {t.contact}
            </button>
            <button type="button" aria-current={page === 'faq' ? 'page' : undefined} onClick={() => setPage('faq')}>
              {t.faq}
            </button>
          </nav>
        )}
        {page === 'contact' && (
          <section className="info-panel" aria-labelledby="contact-heading">
            <h2 id="contact-heading" ref={infoHeading} tabIndex={-1}>{t.contact}</h2>
            <p>{t.contactIntro}</p>
            <p><a href="mailto:santiarrto@gmail.com">santiarrto@gmail.com</a></p>
            <p>{t.contactHelp}</p>
          </section>
        )}
        {page === 'faq' && (
          <section className="info-panel" aria-labelledby="faq-heading">
            <h2 id="faq-heading" ref={infoHeading} tabIndex={-1}>{t.faq}</h2>
            {t.faqItems.map((item) => (
              <section className="faq-item" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </section>
            ))}
          </section>
        )}
        <div hidden={game !== null || page !== 'home'}>
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
