'use client'

import QRCode from 'react-qr-code'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BookingQRProps {
  qrCode: string
  bookingId: string
  className?: string
}

export function BookingQR({ qrCode, bookingId, className }: BookingQRProps) {
  function downloadQR() {
    const svg = document.getElementById('booking-qr-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `luggo-booking-${bookingId.slice(0, 8)}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* QR frame */}
      <div className="bg-white rounded-3xl p-5 shadow-md border border-gray-100">
        <QRCode
          id="booking-qr-svg"
          value={qrCode}
          size={200}
          bgColor="#ffffff"
          fgColor="#011a2e"
          level="M"
        />
      </div>

      {/* Code label */}
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">Booking reference</p>
        <p className="font-mono font-bold text-ocean-900 text-lg tracking-widest">
          {bookingId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Download */}
      <button
        type="button"
        onClick={downloadQR}
        className="flex items-center gap-1.5 text-sm text-brand hover:text-ocean-600 transition-colors font-medium"
      >
        <Download size={14} />
        Save QR code
      </button>
    </div>
  )
}
