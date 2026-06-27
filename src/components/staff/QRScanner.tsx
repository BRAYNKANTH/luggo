'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, KeyboardIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'

interface QRScannerProps {
  onScan: (text: string) => void
  disabled?: boolean
}

type ScannerState = 'init' | 'loading' | 'scanning' | 'error'

export function QRScanner({ onScan, disabled }: QRScannerProps) {
  const [state, setState] = useState<ScannerState>('init')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning?: boolean } | null>(null)
  const scannedRef = useRef(false)
  const ELEMENT_ID = 'luggo-qr-scanner'

  useEffect(() => {
    if (disabled) return
    let mounted = true

    async function start() {
      setState('loading')
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode(ELEMENT_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (!mounted || scannedRef.current) return
            scannedRef.current = true
            // Vibrate on mobile for tactile feedback
            if (navigator.vibrate) navigator.vibrate(100)
            onScan(text)
          },
          () => { /* ignore frame decode errors */ }
        )

        if (mounted) setState('scanning')
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : 'Camera error'
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setCameraError('Camera permission denied. Please allow camera access and try again.')
        } else {
          setCameraError('Camera unavailable. Use manual entry below.')
        }
        setState('error')
        setShowManual(true)
      }
    }

    start()

    return () => {
      mounted = false
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [disabled, onScan])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualCode.trim()
    if (trimmed.length < 8) return
    onScan(trimmed)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Camera viewport */}
      {!showManual && (
        <div className="relative w-full max-w-xs">
          {/* Scanning frame overlay */}
          <div className="relative">
            <div
              id={ELEMENT_ID}
              className={cn(
                'w-full rounded-2xl overflow-hidden bg-black',
                state !== 'scanning' && 'min-h-[280px] flex items-center justify-center'
              )}
            />
            {/* Corner brackets */}
            {state === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* TL */}
                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-brand-accent rounded-tl-lg" />
                {/* TR */}
                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-brand-accent rounded-tr-lg" />
                {/* BL */}
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-brand-accent rounded-bl-lg" />
                {/* BR */}
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-brand-accent rounded-br-lg" />
              </div>
            )}
          </div>

          {/* State overlays */}
          {state === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 rounded-2xl">
              <Spinner size="lg" className="text-brand" />
              <p className="text-white/70 text-sm">Starting camera…</p>
            </div>
          )}
          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 rounded-2xl p-4">
              <CameraOff size={32} className="text-white/50" />
              <p className="text-white/70 text-xs text-center">{cameraError}</p>
            </div>
          )}
          {state === 'scanning' && (
            <p className="text-center text-white/50 text-xs mt-2">
              Point camera at customer&apos;s QR code
            </p>
          )}
        </div>
      )}

      {/* Toggle manual entry */}
      {state === 'scanning' && !showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <KeyboardIcon size={14} />
          Enter code manually
        </button>
      )}

      {/* Manual entry form */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="w-full max-w-xs space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Booking QR code / reference
            </label>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Paste or type the QR code…"
              autoFocus
              className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20
                         text-white placeholder:text-white/30 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <Button type="submit" fullWidth disabled={manualCode.trim().length < 8}>
            Look up booking
          </Button>
          {!cameraError && (
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="w-full text-center text-sm text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <Camera size={14} />
              Back to camera
            </button>
          )}
        </form>
      )}
    </div>
  )
}
