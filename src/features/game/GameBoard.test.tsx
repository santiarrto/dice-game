import { act, fireEvent, render as renderTesting, screen, within } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '../../domain/game'
import { HISTORY_KEY, loadHistory } from '../../persistence/history'
import { LanguageProvider } from '../../i18n'
import { GameBoard } from './GameBoard'

function render(element: ReactElement) {
  return renderTesting(<LanguageProvider language="es">{element}</LanguageProvider>)
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function die(number: number) {
  return screen.getByRole('button', { name: new RegExp(`^Dado ${number}:`) })
}

function keepAll() {
  for (let number = 1; number <= 6; number++) fireEvent.click(die(number))
  fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
}

describe('mesa de juego', () => {
  it('marca a todos los líderes activos y actualiza las coronas al cambiar marcadores y eliminar', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<GameBoard game={createGame(['Ana', 'Luis', 'Eva', 'Sol'], 10, 'manual')} onReturn={vi.fn()} />)
    const rows = within(screen.getByRole('complementary', { name: 'Jugadores' })).getAllByRole('listitem')
    function expectLeaders(indexes: number[]) {
      for (const [index, row] of rows.entries()) {
        if (indexes.includes(index)) {
          const label = within(row).getByText('Líder').parentElement
          if (!label) throw new Error('Falta el indicador de liderazgo.')
          expect(label).toBeVisible()
          expect(within(label).getByText('👑')).toHaveAttribute('aria-hidden', 'true')
        } else {
          expect(within(row).queryByText('Líder')).not.toBeInTheDocument()
        }
      }
    }

    expectLeaders([0, 1, 2, 3])
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expectLeaders([0, 1, 2, 3])
    fireEvent.click(screen.getByRole('radio', { name: 'Siguiente: Luis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
    expectLeaders([0, 2, 3])

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    fireEvent.click(screen.getByRole('radio', { name: 'Anterior: Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
    expectLeaders([2, 3])

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    fireEvent.click(screen.getByRole('radio', { name: 'Siguiente: Sol' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
    expectLeaders([2])

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    random.mockReturnValue(0)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(rows[3]).toHaveTextContent('Eliminado')
    expectLeaders([2])
  })

  it('juega automáticamente y guarda una sola vez la victoria en modo estricto', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<StrictMode><GameBoard game={createGame([
      { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty: 'easy' },
      'Ana',
    ], 10, 'manual')} onReturn={vi.fn()} /></StrictMode>)
    expect(screen.getByRole('button', { name: 'Lanzar dados' })).toBeDisabled()
    for (let step = 0; step < 10; step++) {
      act(() => vi.advanceTimersByTime(650))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Ana')
    expect(loadHistory()).toHaveLength(1)
  })

  it('pausa la IA al confirmar una salida y continúa si se cancela', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<GameBoard game={createGame([
      { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty: 'easy' },
      'Ana',
    ], 20, 'manual')} onReturn={vi.fn()} />)
    act(() => vi.advanceTimersByTime(650))
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('1 de 5')
    expect(die(1)).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Seguir jugando' }))
    act(() => vi.advanceTimersByTime(650))
    expect(die(1)).toHaveAttribute('aria-pressed', 'true')
  })

  it('la IA confirma automáticamente después de apartar su último dado', () => {
    vi.useFakeTimers()
    let calls = 0
    vi.spyOn(Math, 'random').mockImplementation(() => ++calls === 7 ? 0.48 : 0)
    render(<GameBoard game={createGame([
      { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty: 'easy' },
      'Ana',
    ], 10, 'manual')} onReturn={vi.fn()} />)
    act(() => vi.advanceTimersByTime(650))
    act(() => vi.advanceTimersByTime(650))
    act(() => vi.advanceTimersByTime(650))
    expect(die(6)).toBeDisabled()
    expect(screen.getByText(/IA está confirmando su turno/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirmar turno' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(650))
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Ana')
    expect(loadHistory()).toHaveLength(1)
  })

  it('resuelve un ataque de la IA y entrega el control al siguiente jugador', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<GameBoard game={createGame([
      { name: 'IA', avatarId: 'player1', kind: 'ai', difficulty: 'hard' },
      'Ana', 'Luis',
    ], 10, 'manual')} onReturn={vi.fn()} />)
    act(() => vi.advanceTimersByTime(650))
    act(() => vi.advanceTimersByTime(650))
    expect(screen.getByText(/IA sumó 36/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirmar ataque' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(650))
    expect(screen.getByText(/ataque descuenta 6 puntos a Ana/)).toBeVisible()
    act(() => vi.advanceTimersByTime(1400))
    expect(screen.getByText(/Juega:/)).toHaveTextContent('Ana')
    expect(screen.getByRole('button', { name: 'Lanzar dados' })).toBeEnabled()
  })

  it('permite elegir dados, suma la selección y no vuelve a lanzar los apartados', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 20, 'manual')} onReturn={vi.fn()} />)
    expect(die(1)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apartar seleccionados' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(screen.getByText(/Lanzamiento:/)).toHaveTextContent('1 de 5')
    expect(screen.getByRole('button', { name: 'Lanzar dados' })).toBeDisabled()
    expect(die(1).querySelector('.game-die__cube')).toHaveClass('game-die__cube--rolling')
    expect(die(1).querySelector('.game-die__cube')).toHaveAttribute('data-value', '4')
    fireEvent.click(die(1))
    fireEvent.click(die(2))
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('8')
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    expect(die(1)).toBeDisabled()
    expect(die(1)).toHaveAccessibleName('Dado 1: valor 4, apartado, último lanzamiento')

    random.mockReturnValue(0.99)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(die(1).querySelector('.game-die__cube')).not.toHaveClass('game-die__cube--rolling')
    expect(die(3).querySelector('.game-die__cube')).toHaveClass('game-die__cube--rolling')
    expect(die(3).querySelector('.game-die__cube')).toHaveAttribute('data-value', '6')
    expect(die(1)).toHaveAccessibleName('Dado 1: valor 4, apartado')
    expect(die(3)).toHaveAccessibleName('Dado 3: valor 6, disponible, último lanzamiento')
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('8')
  })

  it('aparta el único dado y espera confirmación antes de resolver el turno', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 20, 'manual')} onReturn={vi.fn()} />)
    for (const numbers of [[1, 2], [3, 4], [5]]) {
      fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
      for (const number of numbers) fireEvent.click(die(number))
      fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(die(6)).toBeDisabled()
    expect(die(6)).toHaveAccessibleName('Dado 6: valor 5, apartado, último lanzamiento')
    expect(screen.getByText(/Suma seleccionada:/)).toHaveTextContent('30')
    expect(screen.getByText(/último dado se apartó automáticamente/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Lanzar dados' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apartar seleccionados' })).not.toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Confirmar turno' })
    expect(confirm).toHaveFocus()
    fireEvent.click(confirm)
    expect(screen.getByText(/Los marcadores no cambian/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Siguiente turno' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente turno' }))
    expect(screen.getByText(/Juega:/)).toHaveTextContent('Luis')
  })

  it('confirma el último dado antes de solicitar el objetivo de ataque', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(<GameBoard game={createGame(['Ana', 'Luis', 'Eva'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    for (let number = 1; number <= 5; number++) fireEvent.click(die(number))
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(screen.queryByRole('radio', { name: 'Anterior: Eva' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar turno' }))
    const previous = screen.getByRole('radio', { name: 'Anterior: Eva' })
    expect(previous).toHaveFocus()
    fireEvent.click(previous)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ataque' }))
    expect(screen.getByText(/ataque descuenta 6 puntos a Eva/)).toBeVisible()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')[2]).toHaveTextContent('4 puntos')
  })

  it('muestra y guarda la victoria solo al confirmar el último dado', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<GameBoard game={createGame(['Ana', 'Luis'], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    for (let number = 1; number <= 5; number++) fireEvent.click(die(number))
    fireEvent.click(screen.getByRole('button', { name: 'Apartar seleccionados' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    expect(loadHistory()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar turno' }))
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.getByRole('button', { name: 'Nueva partida' })).toHaveFocus()
    expect(loadHistory()).toHaveLength(1)
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
    expect(rows[2]).toHaveClass('scoreboard__player--affected')

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
    render(<GameBoard game={createGame([
      { name: 'Ana', avatarId: 'player7', kind: 'human' },
      { name: 'Luis', avatarId: 'player8', kind: 'human' },
    ], 10, 'manual')} onReturn={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar dados' }))
    keepAll()
    expect(screen.getByText(/Ana queda eliminado/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ganador: Luis')
    expect(screen.queryByText('Líder')).not.toBeInTheDocument()
    expect(screen.getByText(/Resultado guardado/)).toBeInTheDocument()
    expect(screen.getByText(/Marcador inicial:/)).toHaveTextContent('10 puntos')
    expect(screen.getByText(/Turnos jugados:/)).toHaveTextContent('1')
    expect(screen.getByRole('list')).toHaveTextContent('1.Luis10 puntosGanador2.Ana0 puntosEliminado')
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows[0].querySelector('img')).toHaveAttribute('src', expect.stringContaining('/player8.jpg'))
    expect(rows[1].querySelector('img')).toHaveAttribute('src', expect.stringContaining('/player7.jpg'))
    expect(rows[0].querySelector('img')).toHaveAttribute('alt', '')
    expect(loadHistory()).toMatchObject([{
      winnerId: 'player-2',
      turnCount: 1,
      ranking: ['player-2', 'player-1'],
      players: [{ avatarId: 'player7' }, { avatarId: 'player8' }],
    }])
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
    expect(screen.getByRole('list')).toHaveTextContent('1.Luis10 puntosGanador2.Ana0 puntosEliminado')
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
