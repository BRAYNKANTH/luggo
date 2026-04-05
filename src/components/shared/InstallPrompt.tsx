'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

// Minimal typing for the beforeinstallprompt event (not in lib.dom yet)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'luggo_install_dismissed'

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint]   = useState(false)
  const [visible, setVisible]           = useState(false)

  useEffect(() => {
    // Don't show if already dismissed in this session
    if (sessionStorage.getItem(DISMISS_KEY)) return

    // Already installed as PWA → don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as { standalone?: boolean }).standalone

    if (isIOS) {
      // iOS Safari: can't auto-prompt — show manual "Add to Home Screen" hint
      setShowIOSHint(true)
      setVisible(true)
      return
    }

    // Android/Chrome: capture the deferred install prompt
    function handlePrompt(e: Event) {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
  }

  if (!visible) return null

  // ── iOS hint ────────────────────────────────────────────────────────────────
  if (showIOSHint) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
        <div className="max-w-lg mx-auto mb-3 bg-ocean-900 text-white rounded-3xl p-4 shadow-2xl border border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/20 rounded-2xl flex items-center justify-center shrink-0">
                <Share size={18} className="text-brand" />
              </div>
              <div>
                <p className="font-bold text-sm">Add Luggo to Home Screen</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Tap <Share size={11} className="inline mx-0.5 text-white/70" /> then
                  &ldquo;Add to Home Screen&rdquo; for the full app experience.
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-white/30 hover:text-white/70 transition-colors mt-0.5 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Android / Chrome prompt ─────────────────────────────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="max-w-lg mx-auto mb-3 bg-white rounded-3xl p-4 shadow-2xl border border-gray-100">
        <div className="flex items-center gap-3">
          {/* App icon */}
          <div className="w-12 h-12 rounded-2xl bg-ocean-900 flex items-center justify-center shrink-0">
            <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
              <path
                d="M8 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                stroke="#038cc9"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect x="2" y="7" width="18" height="13" rx="2" fill="#038cc9" />
              <rect x="2" y="12" width="18" height="2" fill="#011a2e" opacity="0.4" />
              <rect x="9" y="10" width="4" height="4" rx="1" fill="#f0c040" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ocean-900 text-sm">Add Luggo to Home Screen</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Get quick access, offline support &amp; a native feel.
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={install}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-ocean-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
        >
          <Download size={16} />
          Install App
        </button>
      </div>
    </div>
  )
}
