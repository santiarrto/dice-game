import { fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_KEY, loadHistory, saveHistory } from '../persistence/history'
import { App } from './App'

const completedGame = {
  id: 'partida-1',
  finishedAt: '2026-01-01T10:00:00.000Z',
  initialScore: 20,
  players: [
    { id: 'a', name: 'Ana', score: 7 },
    { id: 'b', name: 'Luis', score: 0 },
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

  it('muestra en la bienvenida un resultado persistido al volver a cargar', () => {
    saveHistory(completedGame)
    const { unmount } = render(<App />)
    unmount()
    render(<App />)
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Ganador:').parentElement).toHaveTextContent('Ana')
    expect(within(history).getByText('Ana: 7 puntos')).toBeInTheDocument()
    expect(within(history).getByText('Luis: 0 puntos')).toBeInTheDocument()
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
