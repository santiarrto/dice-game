import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '../../domain/game'
import { GameBoard } from './GameBoard'

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

  it('muestra la eliminación y la victoria sin prometer que se guardó', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(screen.getByText(/Ana queda eliminado/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.getByText(/guardado de esta partida aún no están disponibles/)).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('Eliminado')
    expect(screen.queryByRole('button', { name: 'Siguiente turno' })).not.toBeInTheDocument()
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
