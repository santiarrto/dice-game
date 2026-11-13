import { fireEvent, render as renderTesting, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../i18n'
import { SetupForm } from './SetupForm'

function render(element: ReactElement) {
  return renderTesting(<LanguageProvider language="es">{element}</LanguageProvider>)
}

describe('SetupForm', () => {
  it('empieza con dos jugadores, marcador 20 y orden aleatorio', () => {
    render(<SetupForm />)

    expect(screen.getByRole('combobox', { name: 'Cantidad de jugadores' })).toHaveValue('2')
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.getByRole('spinbutton', { name: 'Marcador por jugador' })).toHaveValue(20)
    expect(screen.getByRole('radio', { name: /Al azar/ })).toBeChecked()
    expect(screen.getAllByText('(opcional)')).toHaveLength(2)
  })

  it('permite ordenar jugadores manualmente y pasa la configuración al callback', () => {
    const onStart = vi.fn()
    render(<SetupForm onStart={onStart} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Cantidad de jugadores' }), {
      target: { value: '3' },
    })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), {
      target: { value: 'Ana' },
    })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 2/), {
      target: { value: 'Luis' },
    })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 3/), {
      target: { value: 'Eva' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))

    const orderList = screen.getByRole('list', { name: 'Orden de los turnos' })
    fireEvent.click(within(orderList).getByRole('button', { name: 'Bajar Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))

    expect(onStart).toHaveBeenCalledWith({
      players: [
        { name: 'Luis', avatarId: 'player1', kind: 'human' },
        { name: 'Ana', avatarId: 'player1', kind: 'human' },
        { name: 'Eva', avatarId: 'player1', kind: 'human' },
      ],
      initialScore: 20,
      order: 'manual',
    })
  })

  it('rechaza marcadores no enteros o fuera de rango y acepta los límites', () => {
    const onStart = vi.fn()
    render(<SetupForm onStart={onStart} />)
    const scoreInput = screen.getByRole('spinbutton', { name: 'Marcador por jugador' })

    fireEvent.change(scoreInput, { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('alert')).toHaveTextContent('entero entre 10 y 50')
    expect(onStart).not.toHaveBeenCalled()

    fireEvent.change(scoreInput, { target: { value: '10.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('alert')).toHaveTextContent('entero entre 10 y 50')
    expect(onStart).not.toHaveBeenCalled()

    fireEvent.change(scoreInput, { target: { value: '51' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('alert')).toHaveTextContent('entero entre 10 y 50')
    expect(onStart).not.toHaveBeenCalled()

    fireEvent.change(scoreInput, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(onStart).toHaveBeenNthCalledWith(1, {
      players: [
        { name: 'Jugador 1', avatarId: 'player1', kind: 'human' },
        { name: 'Jugador 2', avatarId: 'player1', kind: 'human' },
      ],
      initialScore: 10,
      order: 'random',
    })

    fireEvent.change(scoreInput, { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(onStart).toHaveBeenNthCalledWith(2, {
      players: [
        { name: 'Jugador 1', avatarId: 'player1', kind: 'human' },
        { name: 'Jugador 2', avatarId: 'player1', kind: 'human' },
      ],
      initialScore: 50,
      order: 'random',
    })
  })

  it('conserva avatares y tipos al cambiar cantidad y orden, y admite avatares repetidos', () => {
    const onStart = vi.fn()
    render(<SetupForm onStart={onStart} />)
    const count = screen.getByRole('combobox', { name: 'Cantidad de jugadores' })
    fireEvent.change(count, { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 1/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 2/), { target: { value: 'Luis' } })
    fireEvent.change(screen.getByLabelText(/Nombre del jugador 3/), { target: { value: 'Eva' } })
    fireEvent.change(screen.getByLabelText('Tipo de jugador 1'), { target: { value: 'ai' } })
    fireEvent.change(screen.getByLabelText('Dificultad de IA del jugador 1'), { target: { value: 'hard' } })

    fireEvent.click(screen.getByText('Avatar del jugador 1: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 20 del jugador 1' }))
    fireEvent.click(screen.getByText('Avatar del jugador 3: 1'))
    fireEvent.click(screen.getByRole('radio', { name: 'Avatar 20 del jugador 3' }))
    fireEvent.change(count, { target: { value: '2' } })
    fireEvent.change(count, { target: { value: '3' } })
    expect(screen.getByLabelText(/Nombre del jugador 3/)).toHaveValue('Eva')
    expect(screen.getByText('Avatar del jugador 3: 20')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Elegir manualmente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(onStart).toHaveBeenCalledWith({
      players: [
        { name: 'Luis', avatarId: 'player1', kind: 'human' },
        { name: 'Ana', avatarId: 'player20', kind: 'ai', difficulty: 'hard' },
        { name: 'Eva', avatarId: 'player20', kind: 'human' },
      ],
      initialScore: 20,
      order: 'manual',
    })
  })

  it('admite de dos a ocho participantes y explica que aún no se puede jugar', () => {
    render(<SetupForm />)
    const countSelect = screen.getByRole('combobox', { name: 'Cantidad de jugadores' })

    fireEvent.change(countSelect, { target: { value: '8' } })
    expect(screen.getAllByRole('textbox')).toHaveLength(8)
    fireEvent.change(countSelect, { target: { value: '2' } })
    expect(screen.getAllByRole('textbox')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Aún no se puede jugar: falta integrar la partida y el historial.',
    )
  })
})
