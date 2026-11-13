export const AVATAR_IDS = [
  'player1', 'player2', 'player3', 'player4', 'player5',
  'player6', 'player7', 'player8', 'player9', 'player10',
  'player11', 'player12', 'player13', 'player14', 'player15',
  'player16', 'player17', 'player18', 'player19', 'player20',
] as const

export type AvatarId = (typeof AVATAR_IDS)[number]

export const DEFAULT_AVATAR_ID: AvatarId = 'player1'

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATAR_IDS.some((id) => id === value)
}
