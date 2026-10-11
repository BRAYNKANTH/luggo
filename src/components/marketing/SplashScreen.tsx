'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface SplashScreenProps {
  onComplete: () => void
  skipLabel?: string
}

// The reveal video is 4s; play it faster and never let it hold the page longer than this.
const MAX_SPLASH_MS = 2500
const PLAYBACK_RATE = 1.6

export function SplashScreen({ onComplete, skipLabel = 'Skip' }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(onComplete, MAX_SPLASH_MS)
    const video = videoRef.current
    if (video) {
      video.playbackRate = PLAYBACK_RATE
      // Always muted: unexpected audio is unwelcome in public places, and muted
      // autoplay is the only kind browsers reliably allow.
      video.play().catch(() => onComplete())
    }
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <video
        ref={videoRef}
        src="/Logo_reveal.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={onComplete}
        className="w-full h-full md:w-[80vw] object-contain mix-blend-multiply"
        style={{
          // Brightness 1.3 pushes the video's grey background to pure white.
          // mix-blend-multiply then treats pure white as completely transparent!
          filter: 'brightness(1.3) contrast(1.1)'
        }}
      />
      <button
        type="button"
        onClick={onComplete}
        className="absolute bottom-8 right-6 min-h-11 px-5 rounded-full text-sm font-semibold text-gray-700 bg-white/90 border border-gray-200 shadow-sm hover:bg-gray-50"
      >
        {skipLabel}
      </button>
    </motion.div>
  )
}
