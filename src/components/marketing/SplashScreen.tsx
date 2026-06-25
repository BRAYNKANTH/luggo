'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Attempt to play with sound first
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Autoplay with sound was blocked by the browser.
        // Fallback: Mute the video and play it automatically so the user isn't stuck.
        console.warn("Autoplay with sound prevented, falling back to muted autoplay:", error)
        video.muted = true
        video.play().catch(e => {
          // If even muted autoplay is blocked (rare), skip the splash screen to prevent freezing
          console.error("Muted autoplay failed", e)
          onComplete()
        })
      })
    }
  }, [onComplete])

  return (
    <motion.div 
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <video
        ref={videoRef}
        src="/Logo_reveal.mp4"
        playsInline
        onEnded={onComplete}
        className="w-full h-full md:w-[80vw] object-contain mix-blend-multiply"
        style={{
          // Brightness 1.3 pushes the video's grey background to pure white.
          // mix-blend-multiply then treats pure white as completely transparent!
          filter: 'brightness(1.3) contrast(1.1)'
        }}
      />
    </motion.div>
  )
}
