'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, KeyboardIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface SealScannerProps {
  onScan: (text: string) => void
  onClose: () => void
}

type ScannerState = 'init' | 'loading' | 'scanning' | 'error'

export function SealScanner({ onScan, onClose }: SealScannerProps) {
  const [state, setState] = useState<ScannerState>('init')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const scannerRef = useRef<{ stop: () => Promise<void>; isScanning?: boolean } | null>(null)
  const scannedRef = useRef(false)
  const ELEMENT_ID = 'luggo-seal-scanner-viewport'

  useEffect(() => {
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
          {
            fps: 15,
            qrbox: (width, height) => {
              // Standard barcode aspect ratio: wide and short
              const boxWidth = Math.min(width * 0.85, 300)
              const boxHeight = Math.min(height * 0.35, 110)
              return { width: boxWidth, height: boxHeight }
            }
          },
          (text) => {
            if (!mounted || scannedRef.current) return
            scannedRef.current = true
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
          setCameraError('Camera permission denied. Please allow camera access.')
        } else {
          setCameraError('Camera unavailable. Enter the seal code manually.')
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
  }, [onScan])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualCode.trim()
    if (!trimmed) return
    onScan(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="w-full max-w-sm space-y-6 flex flex-col items-center">
        <div className="text-center">
          <h3 className="text-white font-extrabold text-lg">Scan Seal Barcode</h3>
          <p className="text-white/50 text-xs mt-1">
            {showManual ? 'Enter the unique seal number below' : 'Align the barcode on the plastic seal in the box'}
          </p>
        </div>

        {/* Viewport wrapper */}
        {!showManual && (
          <div className="relative w-full aspect-[4/3] max-w-[320px] bg-black rounded-2xl overflow-hidden border border-white/10">
            <div id={ELEMENT_ID} className="w-full h-full" />

            {/* Corner brackets optimized for barcode */}
            {state === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Horizontal scanner red guide line */}
                <div className="absolute w-[80%] h-0.5 bg-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                
                {/* Target box corner markings */}
                <div className="w-[85%] h-[35%] border-2 border-white/30 rounded-lg relative">
                  <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-4 border-l-4 border-brand-accent rounded-tl" />
                  <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-4 border-r-4 border-brand-accent rounded-tr" />
                  <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-4 border-l-4 border-brand-accent rounded-bl" />
                  <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-4 border-r-4 border-brand-accent rounded-br" />
                </div>
              </div>
            )}

            {/* Loader / Spinner */}
            {state === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
                <Spinner size="md" className="text-brand-accent" />
                <p className="text-white/70 text-xs">Opening Camera…</p>
              </div>
            )}
          </div>
        )}

        {/* Toggle manual input */}
        {!showManual && state === 'scanning' && (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <KeyboardIcon size={14} />
            Enter code manually
          </button>
        )}

        {/* Manual entry form */}
        {showManual && (
          <form onSubmit={handleManualSubmit} className="w-full space-y-3 px-4">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Type seal serial number…"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20
                         text-white placeholder:text-white/30 text-sm font-mono text-center
                         focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
            />
            <Button type="submit" fullWidth disabled={!manualCode.trim()}>
              Confirm Seal Number
            </Button>
            {!cameraError && (
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="w-full text-center text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                <Camera size={14} />
                Use Camera Barcode Scanner
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
