import { expect, test, type Page } from '@playwright/test'

async function configureGame(page: Page, randomValue: number) {
  await page.goto('/')
  await page.getByLabel(/Nombre del jugador 1/).fill('Ana')
  await page.getByLabel(/Nombre del jugador 2/).fill('Luis')
  await page.getByRole('radio', { name: /Elegir manualmente/ }).check()
  await page.getByRole('spinbutton', { name: 'Marcador por jugador' }).fill('10')
  await setRandomValue(page, randomValue)
  await page.getByRole('button', { name: 'Comenzar partida' }).click()
}

async function rollAndKeepAll(page: Page) {
  await page.getByRole('button', { name: 'Lanzar dados' }).click()
  for (let die = 1; die <= 6; die++) {
    await page.getByRole('button', { name: new RegExp(`^Dado ${die}:`) }).click()
  }
  await page.getByRole('button', { name: 'Apartar seleccionados' }).click()
}

async function setRandomValue(page: Page, value: number) {
  await page.evaluate((nextValue) => {
    Math.random = () => nextValue
  }, value)
}

test('registra la victoria por eliminación y conserva el historial en móvil', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.setViewportSize({ width: 320, height: 780 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await configureGame(page, 0)

  await rollAndKeepAll(page)
  await expect(page.getByRole('status')).toContainText('Ganador: Luis')
  await expect(page.getByText('Ana queda eliminado')).toBeVisible()
  await expect(page.getByRole('list')).toContainText('Ana0 puntosEliminadoLuis10 puntosGanador')
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth <= root.clientWidth
  })).toBe(true)

  const savedMatches = await page.evaluate(() => {
    const stored = localStorage.getItem('dice-game:history')
    return stored === null ? null : JSON.parse(stored) as {
      version: number
      matches: Array<{ winnerId: string; turnCount: number }>
    }
  })
  expect(savedMatches).toMatchObject({
    version: 1,
    matches: [{ winnerId: 'player-2', turnCount: 1 }],
  })
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('permite eliminar al objetivo y registra el resultado sin errores', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await configureGame(page, 0.99)

  await rollAndKeepAll(page)
  await page.getByRole('radio', { name: 'Siguiente: Luis' }).check()
  await page.getByRole('button', { name: 'Confirmar ataque' }).click()
  await expect(page.getByText(/ataque descuenta 6 puntos a Luis/)).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente turno' }).click()
  await setRandomValue(page, 0.8)
  await rollAndKeepAll(page)
  await expect(page.getByText(/Los marcadores no cambian/)).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente turno' }).click()

  await setRandomValue(page, 0.99)
  await rollAndKeepAll(page)
  await page.getByRole('radio', { name: 'Siguiente: Luis' }).check()
  await page.getByRole('button', { name: 'Confirmar ataque' }).click()

  await expect(page.getByRole('status')).toContainText('Ganador: Ana')
  await expect(page.getByText('Luis queda eliminado')).toBeVisible()
  await expect(page.getByRole('list')).toContainText('Ana10 puntosGanadorLuis0 puntosEliminado')
  await expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
