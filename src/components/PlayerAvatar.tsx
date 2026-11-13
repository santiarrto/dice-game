import { useState } from 'react'
import { avatarImage } from '../assets/avatars'
import { DEFAULT_AVATAR_ID, isAvatarId, type AvatarId } from '../domain/avatars'
import { useLanguage } from '../i18n'

interface PlayerAvatarProps {
  avatarId: AvatarId
}

export function PlayerAvatar({ avatarId }: PlayerAvatarProps) {
  const { t } = useLanguage()
  const [failure, setFailure] = useState<{ source: string; fallbackFailed: boolean } | null>(null)
  const fallback = avatarImage(DEFAULT_AVATAR_ID)
  const invalidAvatar = !isAvatarId(avatarId)
  const source = invalidAvatar ? fallback : avatarImage(avatarId)
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
      {(invalidAvatar || sourceFailed) && (
        <span className="player-avatar__notice">
          {unavailable ? t.avatarUnavailable : t.avatarFallback}
        </span>
      )}
    </span>
  )
}
