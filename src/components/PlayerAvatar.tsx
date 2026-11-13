import { useState } from 'react'
import { avatarImage } from '../assets/avatars'
import { DEFAULT_AVATAR_ID, type AvatarId } from '../domain/avatars'

interface PlayerAvatarProps {
  avatarId: AvatarId
}

export function PlayerAvatar({ avatarId }: PlayerAvatarProps) {
  const [failure, setFailure] = useState<{ source: string; fallbackFailed: boolean } | null>(null)
  const source = avatarImage(avatarId)
  const fallback = avatarImage(DEFAULT_AVATAR_ID)
  const sourceFailed = failure?.source === source
  const unavailable = sourceFailed && (source === fallback || failure.fallbackFailed)

  return (
    <span className="player-avatar">
      {unavailable ? (
        <span className="player-avatar__placeholder" aria-hidden="true">?</span>
      ) : (
        <img
          alt=""
          className="player-avatar__image"
          src={sourceFailed ? fallback : source}
          onError={() => setFailure({ source, fallbackFailed: sourceFailed })}
        />
      )}
      {sourceFailed && (
        <span className="player-avatar__notice">
          {unavailable ? 'Avatar no disponible.' : 'Avatar no disponible; se muestra el predeterminado.'}
        </span>
      )}
    </span>
  )
}
