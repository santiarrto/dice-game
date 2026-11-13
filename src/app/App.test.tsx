import { fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '../domain/game'
import { HISTORY_KEY, loadHistory, saveHistory } from '../persistence/history'
import * as gameDomain from '../domain/game'
import { App } from './App'
import { LANGUAGE_KEY } from '../i18n'

const completedGame: GameSummary = {
  id: 'partida-1',
  finishedAt: '2026-01-01T10:00:00.000Z',
  initialScore: 20,
  players: [
    { id: 'a', name: 'Ana', score: 7, avatarId: 'player1' },
    { id: 'b', name: 'Luis', score: 0, avatarId: 'player1' },
  ],
  winnerId: 'a',
  turnCount: 4,
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(LANGUAGE_KEY, JSON.stringify({ version: 1, language: 'es' }))
})
afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('usa inglés por defecto y recuerda español sin perder la configuración', () => {
    localStorage.removeItem(LANGUAGE_KEY)
    const { unmount } = render(<App />)
    expect(screen.getByRole('heading', { name: 'Survive' })).toBeVisible()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Dice game: survive')
    fireEvent.change(screen.getByLabelText(/Player 1 name/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'es' } })
    expect(screen.getByRole('heading', { name: 'Sobrevivir' })).toBeVisible()
    expect(screen.getByLabelText(/Nombre del jugador 1/)).toHaveValue('Ana')
    expect(document.documentElement.lang).toBe('es')
    expect(document.title).toBe('Juego de dados: sobrevivir')
    expect(JSON.parse(localStorage.getItem(LANGUAGE_KEY) ?? '')).toEqual({ version: 1, language: 'es' })
    unmount()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Sobrevivir' })).toBeVisible()
  })

  it.each([
    JSON.stringify({ version: 1, language: 'fr' }),
    JSON.stringify({ version: 2, language: 'es' }),
    '{',
  ])('usa inglés para una preferencia inválida sin modificar los datos: %s', (preference) => {
    saveHistory(completedGame)
    const history = localStorage.getItem(HISTORY_KEY)
    localStorage.setItem(LANGUAGE_KEY, preference)
    render(<App />)
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Winner: Ana')
    expect(localStorage.getItem(HISTORY_KEY)).toBe(history)
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe(preference)
  })

  it('traduce errores visibles al cambiar el idioma y no sobrescribe datos dañados', () => {
    localStorage.removeItem(LANGUAGE_KEY)
    localStorage.setItem(HISTORY_KEY, '{')
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('saved history contains invalid data')
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'es' } })
    expect(screen.getByRole('alert')).toHaveTextContent('historial guardado contiene datos inválidos')
    expect(localStorage.getItem(HISTORY_KEY)).toBe('{')
  })

  it('traduce el error de configuración mientras permanece visible', () => {
    localStorage.removeItem(LANGUAGE_KEY)
    render(<App />)
    fireEvent.change(screen.getByLabelText('Score per player'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    expect(screen.getByRole('alert')).toHaveTextContent('integer between 10 and 50')
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'es' } })
    expect(screen.getByRole('alert')).toHaveTextContent('entero entre 10 y 50')
    expect(screen.getByLabelText('Marcador por jugador')).toHaveValue(9)
  })

  it('informa si no puede guardar el idioma y permite cambiarlo durante la sesión', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })
    render(<App />)
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(screen.getByRole('heading', { name: 'Survive' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('language preference could not be saved')
    expect(JSON.parse(localStorage.getItem(LANGUAGE_KEY) ?? '')).toEqual({ version: 1, language: 'es' })
  })

  it('cambia el idioma durante un turno sin perder dados seleccionados', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    fireEvent.click(screen.getByRole('button', { name: /^Dado 1:/ }))
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(screen.getByRole('heading', { name: 'Game board' })).toBeVisible()
    expect(screen.getByRole('button', { name: /^Die 1: value 1, selected/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Keep selected' })).toBeEnabled()
  })

  it('traduce la confirmación del último dado sin perder el turno', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    for (let die = 1; die <= 5; die++) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dado ${die}:`) }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(screen.getByText(/last die was kept automatically/)).toBeVisible()
    expect(screen.getByRole('button', { name: /^Die 6: value 5, kept/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm turn' }))
    expect(screen.getByText(/Scores do not change/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(screen.getByText(/Playing:/)).toHaveTextContent('Jugador 2')
  })

  it('traduce resultado e historial sin modificar la clasificación guardada', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)
    fireEvent.change(screen.getByLabelText('Marcador por jugador'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    for (let die = 1; die <= 6; die++) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dado ${die}:`) }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    const saved = localStorage.getItem(HISTORY_KEY)
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(screen.getByRole('heading', { name: 'Final ranking' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Winner: Jugador 2')
    expect(screen.getByText(/Jugador 1 is eliminated/)).toBeVisible()
    expect(localStorage.getItem(HISTORY_KEY)).toBe(saved)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Final ranking')
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Jugador 2: 10 points')
  })

  it('presenta la bienvenida y el formulario de configuración', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Sobrevivir' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '¿Quiénes juegan?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
  })

  it('navega al contacto en ambos idiomas sin perder la configuración', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    const stored = localStorage.getItem(HISTORY_KEY)
    fireEvent.click(screen.getByRole('button', { name: 'Contacto y sugerencias' }))
    const heading = screen.getByRole('heading', { name: 'Contacto y sugerencias' })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Contacto y sugerencias' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'santiarrto@gmail.com' })).toHaveAttribute('href', 'mailto:santiarrto@gmail.com')
    expect(screen.getByText(/Esta web no envía ni guarda mensajes/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Comenzar partida' })).not.toBeInTheDocument()
    expect(document.title).toBe('Contacto y sugerencias | Juego de dados: sobrevivir')

    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    expect(screen.getByRole('heading', { name: 'Contact and suggestions' })).toBeVisible()
    expect(screen.getByText(/Nothing is sent or saved by this website/)).toBeVisible()
    expect(document.title).toBe('Contact and suggestions | Dice game: survive')
    expect(localStorage.getItem(HISTORY_KEY)).toBe(stored)
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByLabelText(/Player 1 name/)).toHaveValue('Ana')
  })

  it('presenta las preguntas frecuentes en ambos idiomas y conserva la configuración', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Contacto y sugerencias' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preguntas frecuentes' }))
    const faq = screen.getByRole('region', { name: 'Preguntas frecuentes' })
    expect(within(faq).getByRole('heading', { level: 2 })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Preguntas frecuentes' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Preguntas frecuentes | Juego de dados: sobrevivir')
    expect(within(faq).getAllByRole('heading', { level: 3 })).toHaveLength(9)
    for (const answer of [
      /de 2 a 8 participantes.*manualmente o sortéalo/,
      /20 puntos por defecto.*entre 10 y 50/,
      /seis dados hasta cinco veces.*aparta al menos un dado.*no se vuelven a lanzar/,
      /dados restantes que se lanzaron en el quinto lanzamiento.*aunque no se hayan apartado/,
      /menor que 30.*pierde la diferencia.*igual a 30.*ningún marcador cambia.*mayor que 30.*excedente/,
      /jugador activo anterior o siguiente.*saltan los jugadores eliminados/,
      /no baja de cero.*pérdida excedente se descarta.*última persona activa.*orden inverso de eliminación/,
      /persona o IA.*fácil, media o difícil/,
      /10 partidas terminadas.*solo en este navegador.*no se puede reanudar/,
    ]) expect(within(faq).getByText(answer)).toBeVisible()

    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    const englishFaq = screen.getByRole('region', { name: 'Frequently asked questions' })
    expect(within(englishFaq).getAllByRole('heading', { level: 3 })).toHaveLength(9)
    expect(document.title).toBe('Frequently asked questions | Dice game: survive')
    for (const answer of [
      /2 to 8 participants.*manually or shuffle/,
      /20 points by default.*from 10 to 50/,
      /six dice up to five times.*keep at least one die.*cannot be rolled again/,
      /remaining dice rolled on the fifth roll count.*not kept/,
      /Below 30.*loses the difference.*At 30.*no score changes.*Above 30.*excess/,
      /previous or next active player.*Eliminated players are skipped/,
      /cannot drop below zero.*excess damage is discarded.*last active player wins.*reverse elimination order/,
      /human or AI.*easy, medium or hard/,
      /last 10 completed games.*browser only.*cannot be resumed/,
    ]) expect(within(englishFaq).getByText(answer)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByLabelText(/Player 1 name/)).toHaveValue('Ana')
  })

  it('presenta la historia del juego en ambos idiomas y conserva la configuración', () => {
    saveHistory(completedGame)
    const stored = localStorage.getItem(HISTORY_KEY)
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Marcador por jugador'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntas frecuentes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Acerca de' }))
    const about = screen.getByRole('region', { name: 'Acerca de' })
    expect(within(about).getByRole('heading', { level: 2 })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Acerca de' })).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Acerca de | Juego de dados: sobrevivir')
    expect(within(about).getByText(/2 a 8 participantes.*seis dados.*30.*última persona activa/)).toBeVisible()
    expect(within(about).getByText(/Santiago Arredondo.*compañeros de trabajo.*apuestas.*Santiago desarrolló esta aplicación/)).toBeVisible()
    expect(within(about).getByText(/no incluye apuestas ni pagos/)).toBeVisible()

    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
    const englishAbout = screen.getByRole('region', { name: 'About' })
    expect(document.title).toBe('About | Dice game: survive')
    expect(within(englishAbout).getByText(/2 to 8 participants.*six dice.*30.*last active player wins/)).toBeVisible()
    expect(within(englishAbout).getByText(/Santiago Arredondo.*coworkers.*bets.*Santiago developed this app/)).toBeVisible()
    expect(within(englishAbout).getByText(/does not include betting or payments/)).toBeVisible()
    expect(localStorage.getItem(HISTORY_KEY)).toBe(stored)
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByLabelText(/Player 1 name/)).toHaveValue('Ana')
    expect(screen.getByLabelText('Score per player')).toHaveValue(35)
  })

  it('oculta la navegación durante una partida y la recupera al salir', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    expect(screen.getByRole('button', { name: 'Contacto y sugerencias' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Preguntas frecuentes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Acerca de' })).toBeVisible()
  })

  it('prepara la partida con el orden manual y permite volver a configurar', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 2/), { target: { value: 'Luis' } })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Ana' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Marcador por jugador' }), {
      target: { value: '35' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))

    expect(screen.getByRole('heading', { name: 'Mesa de juego' })).toBeInTheDocument()
    expect(screen.getByText(/Juega:/)).toHaveTextContent('Luis')
    const players = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(players[0]).toHaveTextContent('Luis')
    expect(players[1]).toHaveTextContent('Ana')
    expect(players[0]).toHaveTextContent('35 puntos')

    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre del jugador 1/)).toHaveValue('Luis')
    expect(screen.getByRole('spinbutton', { name: 'Marcador por jugador' })).toHaveValue(35)
  })

  it('inicia con los avatares, tipos y dificultades seleccionados', () => {
    const createGame = vi.spyOn(gameDomain, 'createGame')
    render(<App />)
    fireEvent.change(screen.getByLabelText('Tipo de jugador 1'), { target: { value: 'ai' } })
    fireEvent.click(screen.getByText('Avatar del jugador 1: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 7 del jugador 1' }))
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))

    expect(createGame.mock.results[0].value.players).toMatchObject([
      { avatarId: 'player7', kind: 'ai', difficulty: 'medium' },
      { avatarId: 'player1', kind: 'human' },
    ])
    const board = screen.getByRole('region', { name: 'Mesa de juego' })
    expect(within(board).getByText('La IA juega automáticamente.')).toBeVisible()
    expect(screen.getByText('IA (media)')).toBeVisible()
  })

  it('muestra en la mesa los avatares configurados tras reordenar y eliminar jugadores', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<App />)
    fireEvent.change(screen.getByLabelText('Cantidad de jugadores'), { target: { value: '3' } })
    for (const [index, name] of ['Ana', 'Luis', 'Eva'].entries()) {
      fireEvent.change(screen.getByLabelText(new RegExp(`Nombre del jugador ${index + 1}`)), { target: { value: name } })
    }
    fireEvent.click(screen.getByText('Avatar del jugador 1: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 7 del jugador 1' }))
    fireEvent.click(screen.getByText('Avatar del jugador 2: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 8 del jugador 2' }))
    fireEvent.click(screen.getByText('Avatar del jugador 3: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 7 del jugador 3' }))
    fireEvent.change(screen.getByLabelText('Tipo de jugador 3'), { target: { value: 'ai' } })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Subir Luis' }))
    fireEvent.change(screen.getByLabelText('Marcador por jugador'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))

    const scoreboard = screen.getByRole('complementary', { name: 'Jugadores' })
    const rows = within(scoreboard).getAllByRole('listitem')
    for (const [index, name, avatar] of [[0, 'Luis', 'player8'], [1, 'Ana', 'player7'], [2, 'Eva', 'player7']] as const) {
      expect(rows[index]).toHaveTextContent(name)
      expect(rows[index].querySelector('img')).toHaveAttribute('src', expect.stringContaining(`/${avatar}.jpg`))
      expect(rows[index].querySelector('img')).toHaveAttribute('alt', '')
      expect(rows[index]).toHaveTextContent('10 puntos')
    }
    expect(rows[0]).toHaveTextContent('Actual')
    expect(rows[1]).toHaveTextContent('Siguiente')
    expect(rows[2]).toHaveTextContent('IA (media)')
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    for (let die = 1; die <= 6; die++) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dado ${die}:`) }))
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    expect(rows[0]).toHaveTextContent('Eliminado')
    expect(rows[0]).toHaveTextContent('0 puntos')
    expect(rows[0].querySelector('img')).toHaveAttribute('src', expect.stringContaining('/player8.jpg'))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    expect(rows[0]).toHaveTextContent('Último en jugar')
    expect(rows[1]).toHaveTextContent('Actual')
    expect(rows[2]).toHaveTextContent('Siguiente')
  })

  it('muestra en la bienvenida un resultado persistido al volver a cargar', () => {
    saveHistory({
      ...completedGame,
      players: completedGame.players.map((player, index) => ({
        ...player,
        avatarId: index === 0 ? 'player7' : 'player8',
      })),
    })
    const { unmount } = render(<App />)
    unmount()
    render(<App />)
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Ganador:').parentElement).toHaveTextContent('Ana')
    expect(within(history).getByText('Clasificación no disponible para esta partida.')).toBeVisible()
    expect(within(history).getByText('Ana: 7 puntos')).toBeInTheDocument()
    expect(within(history).getByText('Luis: 0 puntos')).toBeInTheDocument()
    const ana = within(history).getByText('Ana: 7 puntos').closest('li')
    const luis = within(history).getByText('Luis: 0 puntos').closest('li')
    expect(ana?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/player7.jpg'))
    expect(luis?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/player8.jpg'))
    const image = ana?.querySelector('img')
    if (!ana || !image) throw new Error('No se encontró el avatar de Ana.')
    fireEvent.error(image)
    expect(image).toHaveAttribute('src', expect.stringContaining('/player1.jpg'))
    expect(within(ana).getByText(/se muestra el predeterminado/)).toBeVisible()
    fireEvent.error(image)
    expect(within(ana).getByText('Avatar no disponible.')).toBeVisible()
    expect(within(ana).getByText('Ana: 7 puntos')).toBeVisible()
  })

  it('muestra el avatar predeterminado para registros antiguos y avisa si fallan las imágenes', () => {
    const legacy = {
      ...completedGame,
      players: completedGame.players.map(({ id, name, score }) => ({ id, name, score })),
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, matches: [legacy] }))
    render(<App />)
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Clasificación no disponible para esta partida.')).toBeVisible()
    const row = within(history).getByText('Ana: 7 puntos').closest('li')
    if (!row) throw new Error('No se encontró el jugador en el historial.')
    const image = row.querySelector('img')
    if (!image) throw new Error('No se encontró el avatar.')
    expect(image).toHaveAttribute('src', expect.stringContaining('/player1.jpg'))
    fireEvent.error(image)
    expect(within(row).getByText('Avatar no disponible.')).toBeVisible()
    expect(within(row).getByText('Ana: 7 puntos')).toBeVisible()
  })

  it('muestra la clasificación guardada en lugar del orden original de jugadores', () => {
    saveHistory({
      ...completedGame,
      players: [...completedGame.players].reverse(),
      ranking: ['a', 'b'],
    })
    render(<App />)
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Clasificación final:')).toBeVisible()
    const ranking = history.querySelector<HTMLOListElement>('ol.history-item__ranking')
    if (!ranking) throw new Error('No se encontró la clasificación.')
    const rows = within(ranking).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual(['1.Ana: 7 puntos', '2.Luis: 0 puntos'])
  })

  it('avisa y conserva el historial si un avatar de versión 2 es inválido', () => {
    const invalid = JSON.stringify({
      version: 2,
      matches: [{ ...completedGame, players: completedGame.players.map((player) => ({ ...player, avatarId: 'player21' })) }],
    })
    localStorage.setItem(HISTORY_KEY, invalid)
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('datos inválidos')
    expect(localStorage.getItem(HISTORY_KEY)).toBe(invalid)
  })

  it('actualiza el historial al regresar a la bienvenida', () => {
    render(<App />)
    expect(screen.getByText('Aún no hay partidas terminadas en este navegador.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    saveHistory(completedGame)
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    expect(screen.getByText('Ana: 7 puntos')).toBeInTheDocument()
  })

  it('guarda cada victoria una vez, muestra el historial y reinicia la partida', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const { unmount } = render(<StrictMode><App /></StrictMode>)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 2/), { target: { value: 'Luis' } })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Marcador por jugador' }), { target: { value: '10' } })

    function finishGame() {
      fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
      expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('0 de 5')
      expect(screen.getByText(/Juega:/)).toHaveTextContent('Ana')
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      expect(writes).toHaveBeenCalledTimes(loadHistory().length)
      for (let die = 1; die <= 6; die++) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dado ${die}:`) }))
      }
      fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
      expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
      fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }))
    }

    finishGame()
    expect(writes).toHaveBeenCalledTimes(1)
    expect(within(screen.getByRole('region', { name: 'Historial' })).getByText('Luis: 10 puntos')).toBeInTheDocument()
    finishGame()
    expect(writes).toHaveBeenCalledTimes(2)
    expect(new Set(loadHistory().map((match) => match.id)).size).toBe(2)

    unmount()
    render(<App />)
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getAllByText('Luis: 10 puntos')).toHaveLength(2)
    expect(within(history).getAllByText('Ana: 0 puntos')).toHaveLength(2)
  })

  it('integra ataques, eliminación, victoria e historial', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 2/), { target: { value: 'Luis' } })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Marcador por jugador' }), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))

    function rollAndKeepAll() {
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      for (let number = 1; number <= 6; number++) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dado ${number}:`) }))
      }
      fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    }

    rollAndKeepAll()
    expect(screen.getByText(/ataque descuenta 6 puntos a Luis/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar ataque' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))

    vi.mocked(Math.random).mockReturnValue(0.8)
    rollAndKeepAll()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))

    vi.mocked(Math.random).mockReturnValue(0.99)
    rollAndKeepAll()

    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Ana')
    expect(screen.getByText(/Luis queda eliminado/)).toBeInTheDocument()
    expect(loadHistory()).toMatchObject([{
      winnerId: 'player-1',
      turnCount: 3,
      players: [
        { name: 'Ana', score: 10 },
        { name: 'Luis', score: 0 },
      ],
    }])

    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }))
    expect(screen.getByRole('region', { name: 'Historial' })).toHaveTextContent('Ganador: Ana')
    expect(screen.getByRole('region', { name: 'Historial' })).toHaveTextContent('Luis: 0 puntos')
  })

  it('informa de un historial corrupto sin impedir configurar una partida', () => {
    localStorage.setItem(HISTORY_KEY, '{')
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('datos inválidos')
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('heading', { name: 'Mesa de juego' })).toBeInTheDocument()
  })

  it('permite configurar cuando el almacenamiento no está disponible', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('Local storage is unavailable')
    expect(screen.getByRole('status')).toHaveTextContent('language preference could not be read')
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }))
    expect(screen.getByRole('heading', { name: 'Game board' })).toBeInTheDocument()
  })
})
