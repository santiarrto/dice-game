import { describe, expect, it } from 'vitest'
import { AVATAR_IDS, DEFAULT_AVATAR_ID, isAvatarId } from '../domain/avatars'
import { AVATAR_IMAGES, avatarImage } from './avatars'

describe('catálogo de avatares', () => {
  it('resuelve cada identificador estable a su imagen local', () => {
    const expectedIds = Array.from({ length: 20 }, (_, index) => `player${index + 1}`)
    expect(AVATAR_IDS).toEqual(expectedIds)
    expect(Object.keys(AVATAR_IMAGES)).toEqual(expectedIds)
    for (const id of AVATAR_IDS) {
      expect(isAvatarId(id)).toBe(true)
      expect(avatarImage(id)).toMatch(new RegExp(`/player-icons/${id}\\.jpg$`))
    }
    expect(DEFAULT_AVATAR_ID).toBe('player1')
  })

  it('rechaza identificadores inválidos sin construir rutas desde el dato recibido', () => {
    for (const invalid of ['player0', 'player21', '__proto__', '../player1', '', null, 1]) {
      expect(isAvatarId(invalid)).toBe(false)
      expect(() => Reflect.apply(avatarImage, undefined, [invalid])).toThrow('avatar seleccionado no es válido')
    }
  })
})
