import { expect, test, type Page } from '@playwright/test'

async function useSpanish(page: Page) {
  await page.addInitScript(() => localStorage.setItem('dice-game:language', JSON.stringify({ version: 1, language: 'es' })))
}

async function configureGame(page: Page, randomValue: number, avatar?: number) {
  await useSpanish(page)
  await page.goto('/')
  await page.getByLabel(/Nombre del jugador 1/).fill('Ana')
  await page.getByLabel(/Nombre del jugador 2/).fill('Luis')
  if (avatar !== undefined) {
    await page.getByText('Avatar del jugador 1: 1').click()
    await page.getByRole('radio', { name: `Avatar ${avatar} del jugador 1` }).check()
  }
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

for (const viewport of [{ width: 320, height: 780 }, { width: 1280, height: 900 }]) {
  test(`muestra los líderes y actualiza sus coronas en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await useSpanish(page)
    await page.goto('/')
    await page.getByLabel('Cantidad de jugadores').selectOption('3')
    await page.getByLabel(/Nombre del jugador 1/).fill('M'.repeat(40))
    await page.getByLabel(/Nombre del jugador 2/).fill('Luis')
    await page.getByLabel(/Nombre del jugador 3/).fill('Eva')
    await page.getByRole('radio', { name: /Elegir manualmente/ }).check()
    await page.getByRole('spinbutton', { name: 'Marcador por jugador' }).fill('10')
    await setRandomValue(page, 0.99)
    await page.getByRole('button', { name: 'Comenzar partida' }).click()
    const scoreboard = page.getByRole('complementary', { name: 'Jugadores' })
    const rows = scoreboard.getByRole('listitem')
    await expect(scoreboard.getByText('Líder', { exact: true })).toHaveCount(3)
    await expect(rows.nth(0).locator('.scoreboard__leader [aria-hidden="true"]')).toHaveText('👑')
    await rollAndKeepAll(page)
    await page.getByRole('radio', { name: 'Siguiente: Luis' }).check()
    await page.getByRole('button', { name: 'Confirmar ataque' }).click()
    await expect(rows.nth(0).getByText('Líder', { exact: true })).toBeVisible()
    await expect(rows.nth(1).getByText('Líder', { exact: true })).toHaveCount(0)
    await expect(rows.nth(2).getByText('Líder', { exact: true })).toBeVisible()
    await page.getByLabel('Idioma').selectOption('en')
    await expect(page.getByRole('complementary', { name: 'Players' }).getByText('Leader', { exact: true })).toHaveCount(2)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await expect.poll(() => page.getByRole('complementary', { name: 'Players' }).locator('.scoreboard__leader').evaluateAll((labels) =>
      labels.every((label) => {
        const bounds = label.getBoundingClientRect()
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth
      }))).toBe(true)
    expect(errors).toEqual([])
  })

  for (const scenario of [
    { name: 'sin ataque', random: 0.7, attack: false },
    { name: 'con ataque', random: 0.99, attack: true },
  ]) {
    test(`confirma el último dado ${scenario.name} con teclado en ${viewport.width}px`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await configureGame(page, scenario.random)
      for (const numbers of [[1, 2], [3, 4], [5]]) {
        await page.getByRole('button', { name: 'Lanzar dados' }).click()
        for (const number of numbers) await page.getByRole('button', { name: new RegExp(`^Dado ${number}:`) }).click()
        await page.getByRole('button', { name: 'Apartar seleccionados' }).click()
      }
      await page.getByRole('button', { name: 'Lanzar dados' }).click()
      await expect(page.getByRole('button', { name: /^Dado 6:.*apartado/ })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Lanzar dados' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Apartar seleccionados' })).toHaveCount(0)
      await expect(page.getByText(/último dado se apartó automáticamente/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirmar turno' })).toBeFocused()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await page.keyboard.press('Enter')
      if (scenario.attack) {
        const target = page.getByRole('radio', { name: 'Anterior: Luis' })
        await expect(target).toBeFocused()
        await page.keyboard.press('Space')
        await page.keyboard.press('Tab')
        await expect(page.getByRole('button', { name: 'Confirmar ataque' })).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.getByText(/ataque descuenta 6 puntos a Luis/)).toBeVisible()
        await expect(page.getByRole('button', { name: 'Siguiente turno' })).toBeFocused()
      } else {
        await expect(page.getByText(/Los marcadores no cambian/)).toBeVisible()
        await expect(page.getByRole('button', { name: 'Siguiente turno' })).toBeFocused()
      }
      await page.keyboard.press('Enter')
      await expect(page.getByText(/Juega:/)).toContainText('Luis')
      expect(errors).toEqual([])
    })
  }

  test(`consulta las preguntas frecuentes con teclado en ambos idiomas en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByLabel('Player 1 name').fill('Ana')
    await page.getByLabel('Language').focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const faqButton = page.getByRole('button', { name: 'Frequently asked questions' })
    await expect(faqButton).toBeFocused()
    await page.keyboard.press('Enter')
    const faq = page.getByRole('region', { name: 'Frequently asked questions' })
    await expect(faq.getByRole('heading', { level: 2 })).toBeFocused()
    await expect(faqButton).toHaveAttribute('aria-current', 'page')
    await expect(faq.getByRole('heading', { level: 3 })).toHaveCount(9)
    await expect(faq.getByText(/remaining dice rolled on the fifth roll count/)).toBeVisible()
    await expect(page).toHaveTitle('Frequently asked questions | Dice game: survive')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.getByLabel('Language').selectOption('es')
    const spanishFaq = page.getByRole('region', { name: 'Preguntas frecuentes' })
    await expect(spanishFaq.getByRole('heading', { level: 3 })).toHaveCount(9)
    await expect(spanishFaq.getByText(/dados restantes que se lanzaron en el quinto lanzamiento/)).toBeVisible()
    await expect(page).toHaveTitle('Preguntas frecuentes | Juego de dados: sobrevivir')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.getByLabel('Idioma').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Inicio' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel(/Nombre del jugador 1/)).toHaveValue('Ana')
    expect(errors).toEqual([])
  })

  test(`navega al contacto con teclado en ambos idiomas en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const contact = page.getByRole('button', { name: 'Contact and suggestions' })
    await expect(contact).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Contact and suggestions' })).toBeFocused()
    await expect(contact).toHaveAttribute('aria-current', 'page')
    const email = page.getByRole('link', { name: 'santiarrto@gmail.com' })
    await page.keyboard.press('Tab')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('href', 'mailto:santiarrto@gmail.com')
    await expect(page.getByText('This link opens your email app. Nothing is sent or saved by this website.')).toBeVisible()
    await page.getByLabel('Language').selectOption('es')
    await expect(page.getByRole('heading', { name: 'Contacto y sugerencias' })).toBeVisible()
    await expect(page.getByText('Este enlace abre tu aplicación de correo. Esta web no envía ni guarda mensajes.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'santiarrto@gmail.com' })).toHaveAttribute('href', 'mailto:santiarrto@gmail.com')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.getByRole('button', { name: 'Inicio' }).click()
    await expect(page.getByRole('heading', { name: '¿Quiénes juegan?' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test(`muestra el logo y carga el favicon en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await page.goto('/')
    const logo = page.locator('img.welcome__icon')
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('alt', '')
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]))
      .toEqual([128, 128])
    await expect(logo).toHaveCSS('width', '56px')
    const icon = page.locator('link[rel="icon"]')
    await expect(icon).toHaveAttribute('type', 'image/png')
    await expect(icon).toHaveAttribute('sizes', '32x32')
    const favicon = await icon.evaluate(async (link: HTMLLinkElement) => {
      const response = await fetch(link.href)
      if (!response.ok) throw new Error('No se pudo cargar el favicon.')
      const image = new Image()
      image.src = link.href
      await image.decode()
      return { type: response.headers.get('content-type'), width: image.naturalWidth, height: image.naturalHeight }
    })
    expect(favicon).toEqual({ type: 'image/png', width: 32, height: 32 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })

  test(`configura avatar e IA con teclado en ${viewport.width}px`, async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await useSpanish(page)
    await page.goto('/')

    async function tabTo(selector: string) {
      const target = page.locator(selector)
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await target.evaluate((element) => element === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error(`No se pudo alcanzar con teclado: ${selector}`)
    }

    await tabTo('select[aria-label="Cantidad de jugadores"]')
    await tabTo('input[placeholder="Jugador 1"]')
    await page.keyboard.type('Ana')
    await tabTo('.player-setup:first-child select')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByLabel('Tipo de jugador 1')).toHaveValue('ai')
    await expect(page.getByLabel('Dificultad de IA del jugador 1')).toHaveValue('medium')
    await tabTo('.player-setup:first-child summary')
    await page.keyboard.press('Enter')
    await tabTo('input[aria-label="Avatar 1 del jugador 1"]')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Avatar 2 del jugador 1' })).toBeChecked()
    await expect(page.getByText('Avatar del jugador 1: 2')).toBeVisible()
    await expect(page.locator('input[aria-label="Avatar 1 del jugador 2"]')).toBeChecked()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await tabTo('button[type="submit"]')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Mesa de juego' })).toBeVisible()
    await expect(page.getByText('IA (media)')).toBeVisible()
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    test(`partida mixta con IA ${difficulty} en ${viewport.width}px`, async ({ page }) => {
      const pageErrors: string[] = []
      const consoleErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      await page.setViewportSize(viewport)
      await useSpanish(page)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      await page.getByLabel(/Nombre del jugador 1/).fill('Ana')
      await page.getByLabel(/Nombre del jugador 2/).fill('IA')
      await page.getByLabel('Tipo de jugador 2').selectOption('ai')
      await page.getByLabel('Dificultad de IA del jugador 2').selectOption(difficulty)
      await page.getByRole('radio', { name: /Elegir manualmente/ }).check()
      await page.getByRole('spinbutton', { name: 'Marcador por jugador' }).fill('10')
      await setRandomValue(page, 0.8)
      await page.getByRole('button', { name: 'Comenzar partida' }).click()
      await rollAndKeepAll(page)
      await expect(page.getByText(/Los marcadores no cambian/)).toBeVisible()
      await setRandomValue(page, 0)
      await page.getByRole('button', { name: 'Siguiente turno' }).click()
      await expect(page.getByText('La IA juega automáticamente.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Lanzar dados' })).toBeDisabled()
      await expect(page.getByRole('status')).toContainText('Ganador: Ana', { timeout: 15_000 })
      await expect(page.getByText(/IA queda eliminado/)).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await page.getByRole('button', { name: 'Nueva partida' }).click()
      await expect(page.getByRole('region', { name: 'Historial' })).toContainText('Ganador: Ana')
      expect(pageErrors).toEqual([])
      expect(consoleErrors).toEqual([])
    })
  }

  test(`conserva la clasificación de tres jugadores en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await useSpanish(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByLabel('Cantidad de jugadores').selectOption('3')
    for (const [index, name] of ['Ana', 'Luis', 'Eva'].entries()) {
      await page.getByLabel(`Nombre del jugador ${index + 1}`).fill(name)
    }
    await page.getByRole('radio', { name: /Elegir manualmente/ }).check()
    await page.getByRole('spinbutton', { name: 'Marcador por jugador' }).fill('10')
    await setRandomValue(page, 0)
    await page.getByRole('button', { name: 'Comenzar partida' }).click()
    await rollAndKeepAll(page)
    await page.getByRole('button', { name: 'Siguiente turno' }).click()
    await rollAndKeepAll(page)

    await expect(page.getByRole('status')).toContainText('Ganador: Eva')
    const result = page.getByRole('list').getByRole('listitem')
    await expect(result).toHaveCount(3)
    await expect(result.nth(0)).toContainText('1.Eva')
    await expect(result.nth(1)).toContainText('2.Luis')
    await expect(result.nth(2)).toContainText('3.Ana')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    await page.reload()
    const history = page.getByRole('region', { name: 'Historial' })
    const ranking = history.locator('.history-item__ranking > li')
    await expect(ranking).toHaveCount(3)
    await expect(ranking.nth(0)).toContainText('1.Eva')
    await expect(ranking.nth(1)).toContainText('2.Luis')
    await expect(ranking.nth(2)).toContainText('3.Ana')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })

  test(`cambia y recuerda el idioma en ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Survive' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle('Dice game: survive')
    await page.getByLabel('Player 1 name').fill('Ana')
    await page.getByLabel('Language').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('heading', { name: 'Sobrevivir' })).toBeVisible()
    await expect(page.getByLabel(/Nombre del jugador 1/)).toHaveValue('Ana')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sobrevivir' })).toBeVisible()
    await expect(page.getByLabel('Idioma')).toHaveValue('es')
    await page.getByLabel(/Nombre del jugador 1/).fill('Ana')
    await page.getByLabel(/Nombre del jugador 2/).fill('Luis')
    await page.getByRole('radio', { name: /Elegir manualmente/ }).check()
    await page.getByRole('spinbutton', { name: 'Marcador por jugador' }).fill('10')
    await setRandomValue(page, 0)
    await page.getByRole('button', { name: 'Comenzar partida' }).click()
    await rollAndKeepAll(page)
    await expect(page.getByRole('status')).toContainText('Ganador: Luis')
    await page.getByLabel('Idioma').selectOption('en')
    await expect(page.getByRole('status')).toContainText('Winner: Luis')
    await expect(page.getByRole('heading', { name: 'Final ranking' })).toBeVisible()
    await page.getByRole('button', { name: 'New game' }).click()
    await expect(page.getByRole('region', { name: 'History' })).toContainText('Final ranking:')
    await expect(page.getByRole('region', { name: 'History' })).toContainText('Luis: 10 points')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })
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
  await configureGame(page, 0, 7)

  await rollAndKeepAll(page)
  await expect(page.getByRole('status')).toContainText('Ganador: Luis')
  await expect(page.getByText('Ana queda eliminado')).toBeVisible()
  await expect(page.getByRole('list')).toContainText('1.Luis10 puntosGanador2.Ana0 puntosEliminado')
  const resultRows = page.getByRole('list').getByRole('listitem')
  await expect(resultRows.nth(0).locator('img')).toHaveAttribute('src', /player1/)
  await expect(resultRows.nth(1).locator('img')).toHaveAttribute('src', /player7/)
  await expect.poll(() => resultRows.nth(0).locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth <= root.clientWidth
  })).toBe(true)

  await page.reload()
  const history = page.getByRole('region', { name: 'Historial' })
  await expect(history).toContainText('Ganador: Luis')
  await expect(history.getByText('Ana: 0 puntos').locator('..').locator('img')).toHaveAttribute('src', /player7/)
  await expect(history.getByText('Luis: 10 puntos').locator('..').locator('img')).toHaveAttribute('src', /player1/)
  const anaRow = history.getByText('Ana: 0 puntos').locator('..')
  await anaRow.locator('img').dispatchEvent('error')
  await expect(anaRow.locator('img')).toHaveAttribute('src', /player1/)
  await expect(anaRow.getByText(/se muestra el predeterminado/)).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const savedMatches = await page.evaluate(() => {
    const stored = localStorage.getItem('dice-game:history')
    return stored === null ? null : JSON.parse(stored) as {
      version: number
      matches: Array<{ winnerId: string; turnCount: number; players: Array<{ avatarId: string }> }>
    }
  })
  expect(savedMatches).toMatchObject({
    version: 2,
    matches: [{
      winnerId: 'player-2',
      turnCount: 1,
      players: [{ avatarId: 'player7' }, { avatarId: 'player1' }],
    }],
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
  await configureGame(page, 0.99, 7)

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
  await expect(page.getByRole('list')).toContainText('1.Ana10 puntosGanador2.Luis0 puntosEliminado')
  await expect(page.getByRole('list').getByRole('listitem').nth(0).locator('img')).toHaveAttribute('src', /player7/)
  await expect.poll(() => page.getByRole('list').getByRole('listitem').nth(0).locator('img')
    .evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Historial' }).getByText('Ana: 10 puntos').locator('..').locator('img'))
    .toHaveAttribute('src', /player7/)
  await expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
