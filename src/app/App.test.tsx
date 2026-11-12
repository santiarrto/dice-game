import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

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

    expect(screen.getByRole('heading', { name: 'Partida preparada' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('El tablero de juego aún está en desarrollo.')
    expect(screen.getByText('Marcador inicial: 35 puntos por jugador.')).toBeInTheDocument()
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['Luis', 'Ana'])

    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }))
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre del jugador 1/)).toHaveValue('Luis')
    expect(screen.getByRole('spinbutton', { name: 'Marcador por jugador' })).toHaveValue(35)
  })
})
