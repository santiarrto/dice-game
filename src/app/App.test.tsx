import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('presenta el juego y avisa que está en desarrollo', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Sobrevivir' })).toBeInTheDocument()
    expect(screen.getByText('El juego está en desarrollo.')).toBeInTheDocument()
  })
})
