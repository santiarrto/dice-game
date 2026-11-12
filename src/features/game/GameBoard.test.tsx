import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '../../domain/game'
import { HISTORY_KEY, loadHistory } from '../../persistence/history'
import { GameBoard } from './GameBoard'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

function die(number: number) {
  return screen.getByRole('button', { name: new RegExp(`^Dado ${number}:`) })
}

function keepAll() {
  for (let number = 1; number <= 6; number++) fireEvent.click(die(number))
  fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
}

describe('mesa de juego', () => {
  it('permite elegir dados, suma la selección y no vuelve a lanzar los apartados', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 20, 'manual')} onReturn={vi.fn()} />)
    expect(die(1)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apartar seleccionados' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('1 de 5')
    expect(screen.getByRole('button', { name: 'Lanzar dados' })).toBeDisabled()
    fireEvent.click(die(1))
    fireEvent.click(die(2))
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('8')
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    expect(die(1)).toBeDisabled()
    expect(die(1)).toHaveAccessibleName('Dado 1: valor 4, apartado, último lanzamiento')

    random.mockReturnValue(0.99)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(die(1)).toHaveAccessibleName('Dado 1: valor 4, apartado')
    expect(die(3)).toHaveAccessibleName('Dado 3: valor 6, disponible, último lanzamiento')
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('8')
  })

  it('pide confirmar un objetivo y actualiza los marcadores y turnos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<GameBoard game={createGame(['Ana', 'Luis', 'Eva'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()

    const confirm = screen.getByRole('button', { name: 'Confirmar ataque' })
    expect(confirm).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Anterior: Eva' }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')[2]).toHaveTextContent('10 puntos')
    fireEvent.click(confirm)
    expect(screen.getByText(/ataque descuenta 6 puntos a Eva/)).toBeInTheDocument()

    const scoreboard = screen.getByRole('list')
    const rows = within(scoreboard).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Ana')
    expect(rows[0]).toHaveTextContent('Último en jugar')
    expect(rows[1]).toHaveTextContent('Luis')
    expect(rows[1]).toHaveTextContent('Siguiente')
    expect(rows[2]).toHaveTextContent('Eva')
    expect(rows[2]).toHaveTextContent('4 puntos')

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    expect(screen.getByText(/Juega:/)).toHaveTextContent('Luis')
    expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('0 de 5')
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('0')
  })

  it('cuenta los dados restantes en el quinto lanzamiento', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 20, 'manual')} onReturn={vi.fn()} />)
    for (let number = 1; number <= 4; number++) {
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      fireEvent.click(die(number))
      fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('5 de 5')
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('24')
    expect(screen.getByText(/dados del quinto lanzamiento se cuentan automáticamente/i)).toBeInTheDocument()
    expect(screen.getByText(/se descuentan 6 puntos a Ana/i)).toBeInTheDocument()
    expect(die(5)).toHaveTextContent('Último lanzamiento')
    expect(die(5)).toBeDisabled()
  })

  it('muestra el resultado final y lo guarda cuando un jugador se elimina', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(screen.getByText(/Ana queda eliminado/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.getByText(/Resultado guardado/)).toBeInTheDocument()
    expect(screen.getByText(/Marcador inicial:/)).toHaveTextContent('10 puntos')
    expect(screen.getByText(/Turnos jugados:/)).toHaveTextContent('1')
    expect(screen.getByRole('list')).toHaveTextContent('Ana0 puntosEliminadoLuis10 puntosGanador')
    expect(loadHistory()).toMatchObject([{ winnerId: 'player-2', turnCount: 1 }])
    expect(screen.queryByRole('button', { name: 'Siguiente turno' })).not.toBeInTheDocument()
  })

  it('guarda el resultado cuando termina al confirmar un ataque', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    for (let turn = 0; turn < 3; turn++) {
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      keepAll()
      fireEvent.click(screen.getByRole('radio', { name: /Siguiente:/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
      if (turn < 2) fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Ana')
    expect(screen.getByText(/Turnos jugados:/)).toHaveTextContent('3')
    expect(loadHistory()).toMatchObject([{ winnerId: 'player-1', turnCount: 3 }])
  })

  it('guarda el resultado si la victoria ocurre en el quinto lanzamiento', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    for (let number = 1; number <= 4; number++) {
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      fireEvent.click(die(number))
      fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(loadHistory()).toHaveLength(1)
  })

  it('conserva el resultado visible si falla el guardado y no sobrescribe el historial', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    localStorage.setItem(HISTORY_KEY, '{')
    const onReturn = vi.fn()
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.getByRole('alert')).toHaveTextContent('El resultado no se guardó')
    expect(screen.getByRole('list')).toHaveTextContent('Ana0 puntosEliminadoLuis10 puntosGanador')
    expect(localStorage.getItem(HISTORY_KEY)).toBe('{')
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }))
    expect(onReturn).toHaveBeenCalledOnce()
  })

  it('informa si el navegador rechaza la escritura del resultado', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar el historial local')
  })

  it('pide confirmación antes de abandonar una partida en curso', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const onReturn = vi.fn()
    render(<GameBoard game={createGame(['Ana', 'Luis'], 20, 'manual')} onReturn={onReturn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    expect(screen.getByText(/se perderá la partida/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir jugando' }))
    expect(onReturn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar salida' }))
    expect(onReturn).toHaveBeenCalledOnce()
  })
})
