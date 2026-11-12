import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetupForm } from './SetupForm'

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
      names: ['Luis', 'Ana', 'Eva'],
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
      names: ['Jugador 1', 'Jugador 2'],
      initialScore: 10,
      order: 'random',
    })

    fireEvent.change(scoreInput, { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(onStart).toHaveBeenNthCalledWith(2, {
      names: ['Jugador 1', 'Jugador 2'],
      initialScore: 50,
      order: 'random',
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
