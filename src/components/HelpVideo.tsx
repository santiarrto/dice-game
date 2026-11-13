import { useRef, useState } from 'react'
import videoUrl from '../assets/video/dice-brawl.mp4'
import { useLanguage } from '../i18n'

export function HelpVideo() {
  const { t } = useLanguage()
  const button = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const session = useRef(0)
  const [error, setError] = useState(false)

  function openVideo() {
    const currentDialog = dialog.current
    const currentVideo = video.current
    if (!currentDialog || !currentVideo) throw new Error('The help video dialog is unavailable.')

    const currentSession = ++session.current
    setError(false)
    currentDialog.showModal()
    void currentVideo.play().catch(() => {
      if (currentSession === session.current && currentDialog.open) setError(true)
    })
  }

  function onClose() {
    session.current++
    video.current?.pause()
    setError(false)
    button.current?.focus()
  }

  return (
    <div className="help-video">
      <button ref={button} className="help-video__open" type="button" onClick={openVideo}>
        <span className="help-video__icon" aria-hidden="true">?</span>
        {t.howToPlay}
      </button>
      <dialog ref={dialog} className="help-video__dialog" aria-labelledby="help-video-heading" onClose={onClose}>
        <div className="help-video__header">
          <h2 id="help-video-heading">{t.howToPlay}</h2>
          <button type="button" autoFocus onClick={() => dialog.current?.close()}>{t.close}</button>
        </div>
        <video
          ref={video}
          aria-label={t.howToPlay}
          controls
          playsInline
          preload="none"
          src={videoUrl}
          onError={() => setError(true)}
          onPlay={() => setError(false)}
        >
          {t.videoError}
        </video>
        {error && <p role="alert">{t.videoError}</p>}
      </dialog>
    </div>
  )
}
