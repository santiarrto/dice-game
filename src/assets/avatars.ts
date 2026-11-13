import player1 from './player-icons/player1.jpg'
import player2 from './player-icons/player2.jpg'
import player3 from './player-icons/player3.jpg'
import player4 from './player-icons/player4.jpg'
import player5 from './player-icons/player5.jpg'
import player6 from './player-icons/player6.jpg'
import player7 from './player-icons/player7.jpg'
import player8 from './player-icons/player8.jpg'
import player9 from './player-icons/player9.jpg'
import player10 from './player-icons/player10.jpg'
import player11 from './player-icons/player11.jpg'
import player12 from './player-icons/player12.jpg'
import player13 from './player-icons/player13.jpg'
import player14 from './player-icons/player14.jpg'
import player15 from './player-icons/player15.jpg'
import player16 from './player-icons/player16.jpg'
import player17 from './player-icons/player17.jpg'
import player18 from './player-icons/player18.jpg'
import player19 from './player-icons/player19.jpg'
import player20 from './player-icons/player20.jpg'
import { isAvatarId, type AvatarId } from '../domain/avatars'

export const AVATAR_IMAGES: Readonly<Record<AvatarId, string>> = {
  player1, player2, player3, player4, player5,
  player6, player7, player8, player9, player10,
  player11, player12, player13, player14, player15,
  player16, player17, player18, player19, player20,
}

export function avatarImage(id: AvatarId): string {
  if (!isAvatarId(id)) throw new RangeError('El avatar seleccionado no es válido.')
  return AVATAR_IMAGES[id]
}
