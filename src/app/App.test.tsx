import { fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '../domain/game'
import { HISTORY_KEY, loadHistory, saveHistory } from '../persistence/history'
import * as gameDomain from '../domain/game'
import { App } from './App'

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

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('presenta la bienvenida y el formulario de configuración', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Sobrevivir' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '¿Quiénes juegan?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
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
    const row = within(history).getByText('Ana: 7 puntos').closest('li')
    if (!row) throw new Error('No se encontró el jugador en el historial.')
    const image = row.querySelector('img')
    if (!image) throw new Error('No se encontró el avatar.')
    expect(image).toHaveAttribute('src', expect.stringContaining('/player1.jpg'))
    fireEvent.error(image)
    expect(within(row).getByText('Avatar no disponible.')).toBeVisible()
    expect(within(row).getByText('Ana: 7 puntos')).toBeVisible()
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
    fireEvent.click(screen.getByRole('radio', { name: 'Siguiente: Luis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))

    vi.mocked(Math.random).mockReturnValue(0.8)
    rollAndKeepAll()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))

    vi.mocked(Math.random).mockReturnValue(0.99)
    rollAndKeepAll()
    fireEvent.click(screen.getByRole('radio', { name: 'Siguiente: Luis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))

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
    expect(screen.getByRole('alert')).toHaveTextContent('almacenamiento local no está disponible')
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('heading', { name: 'Mesa de juego' })).toBeInTheDocument()
  })
})
