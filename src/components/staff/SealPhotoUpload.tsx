'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { uploadSealProof } from '@/lib/staff/actions'

interface SealPhotoUploadProps {
  bookingId: string
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'saving' | 'done' | 'error'

export function SealPhotoUpload({ bookingId }: SealPhotoUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<UploadState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type and size (max 10 MB)
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10 MB.')
      return
    }

    setError(null)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setState('preview')
  }

  function clearPhoto() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile) return
    setState('uploading')
    setError(null)

    try {
      setState('saving')
      const formData = new FormData()
      formData.set('photo', selectedFile)
      const result = await uploadSealProof(bookingId, formData)

      if (result.error) {
        setError(result.error)
        setState('preview')
        return
      }

      setState('done')
      setTimeout(() => router.push(`/staff/booking/${bookingId}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.')
      setState('preview')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="h-14 w-14 rounded-full bg-brand-success/20 flex items-center justify-center">
          <CheckCircle size={28} className="text-brand-success" />
        </div>
        <p className="font-bold text-white">Seal proof saved!</p>
        <p className="text-white/50 text-sm">Customer has been notified to confirm.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Photo preview or picker */}
      {state === 'idle' || state === 'preview' ? (
        <>
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src={previewUrl}
                alt="Seal photo preview"
                width={400}
                height={300}
                className="w-full object-cover max-h-64"
                unoptimized
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[200px] rounded-2xl border-2 border-dashed border-white/20
                         flex flex-col items-center justify-center gap-3
                         hover:border-brand hover:bg-white/5 transition-all"
            >
              <Camera size={36} className="text-white/40" />
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Take or upload photo</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Photo all sealed bags clearly visible
                </p>
              </div>
            </button>
          )}
        </>
      ) : null}

      {/* Upload / uploading states */}
      {(state === 'uploading' || state === 'saving') && (
        <div className="bg-white/10 rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-white text-sm">
            {state === 'uploading' ? 'Uploading photo…' : 'Saving seal record…'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      {state === 'idle' && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => fileInputRef.current?.click()}
          className="border-white/30 text-white hover:bg-white/10 hover:text-white hover:border-white/50"
        >
          <Camera size={16} />
          Take / choose photo
        </Button>
      )}

      {state === 'preview' && previewUrl && (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
          >
            Retake
          </Button>
          <Button
            type="button"
            fullWidth
            onClick={handleUpload}
            className="flex-[2]"
          >
            <Upload size={16} />
            Upload & notify customer
          </Button>
        </div>
      )}
    </div>
  )
}
