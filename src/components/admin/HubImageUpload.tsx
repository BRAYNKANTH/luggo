'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { uploadHubImage } from '@/lib/admin/actions'

interface HubImageUploadProps {
  hubId: string
  hubName: string
  currentImageUrl: string | null
}

export function HubImageUpload({ hubId, hubName, currentImageUrl }: HubImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImageUrl)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setStatus('idle')
    setMessage(null)
    const formData = new FormData()
    formData.append('image', file)

    startTransition(async () => {
      const result = await uploadHubImage(hubId, formData)
      if (result.error) {
        setStatus('error')
        setMessage(result.error)
        setPreview(currentImageUrl) // revert preview on error
      } else {
        setStatus('success')
        setMessage('Image updated!')
      }
    })
  }

  return (
    <div className="mt-3">
      {/* Current / preview image */}
      <div
        className="relative w-full h-28 rounded-xl overflow-hidden bg-gray-100 cursor-pointer group border-2 border-dashed border-gray-200 hover:border-brand/40 transition-colors"
        onClick={() => !isPending && inputRef.current?.click()}
      >
        {/* eslint-disable @next/next/no-img-element */}
        {preview ? (
          <img src={preview} alt={hubName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300">
            <ImagePlus size={24} />
            <span className="text-xs font-medium">Add photo</span>
          </div>
        )}

        {/* Upload overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white text-xs font-bold transition-opacity ${
          isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <ImagePlus size={16} />
              {preview ? 'Change photo' : 'Upload photo'}
            </>
          )}
        </div>
      </div>

      {/* Status */}
      {message && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 ${
          status === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-600'
        }`}>
          {status === 'success'
            ? <CheckCircle size={13} />
            : <AlertCircle size={13} />}
          {message}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X size={12} />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG or WebP · max 5 MB</p>
    </div>
  )
}
