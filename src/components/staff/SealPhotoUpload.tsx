'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { uploadSealProof, finalizeCheckInAction } from '@/lib/staff/actions'
import { createClient } from '@/lib/supabase/client'
import { type BagType } from '@/types/database'
import { BAG_LABELS } from '@/lib/utils/pricing'

interface SealPhotoUploadProps {
  bookingId: string
  bags: Array<{
    id: string
    bag_type: BagType
    seal_status: string
    seal_number: string | null
  }>
}

export function SealPhotoUpload({ bookingId, bags }: SealPhotoUploadProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Map bag_id to uploaded file path/URL
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({})
  
  // Track upload states for each bag: 'idle' | 'uploading' | 'saving' | 'done' | 'error'
  const [bagStates, setBagStates] = useState<Record<string, 'idle' | 'uploading' | 'saving' | 'done'>>({})
  const [bagErrors, setBagErrors] = useState<Record<string, string>>({})
  
  // Refs for hidden inputs
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  // Fetch already uploaded evidence on mount
  useEffect(() => {
    async function loadEvidence() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('booking_bag_evidence')
          .select('bag_id, file_url')
          .eq('booking_id', bookingId) as { data: { bag_id: string | null; file_url: string }[] | null; error: unknown }
        
        if (fetchErr) {
          console.error('Evidence fetch error:', fetchErr)
          return
        }

        if (data) {
          const map: Record<string, string> = {}
          const states: Record<string, 'idle' | 'uploading' | 'saving' | 'done'> = {}
          data.forEach((e) => {
            if (e.bag_id) {
              map[e.bag_id] = e.file_url
              states[e.bag_id] = 'done'
            }
          })
          setUploadedPhotos(map)
          setBagStates(states)
        }
      } catch (err) {
        console.error('Failed to load bag evidence:', err)
      }
    }
    loadEvidence()
  }, [bookingId, supabase])

  // Trigger file picker for specific bag
  function handlePickPhoto(bagId: string) {
    fileInputs.current[bagId]?.click()
  }

  // Handle file capture
  async function handleFileChange(bagId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous error
    setBagErrors((prev) => ({ ...prev, [bagId]: '' }))

    if (!file.type.startsWith('image/')) {
      setBagErrors((prev) => ({ ...prev, [bagId]: 'Please select an image file.' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setBagErrors((prev) => ({ ...prev, [bagId]: 'Photo must be under 10 MB.' }))
      return
    }

    // Set uploading state
    setBagStates((prev) => ({ ...prev, [bagId]: 'uploading' }))

    try {
      setBagStates((prev) => ({ ...prev, [bagId]: 'saving' }))
      const formData = new FormData()
      formData.set('photo', file)
      
      const result = await uploadSealProof(bookingId, bagId, formData)

      if (result.error) {
        setBagErrors((prev) => ({ ...prev, [bagId]: result.error || 'Upload failed' }))
        setBagStates((prev) => ({ ...prev, [bagId]: 'idle' }))
        return
      }

      setBagStates((prev) => ({ ...prev, [bagId]: 'done' }))
      
      // Force reload evidence from server
      const { data } = await supabase
        .from('booking_bag_evidence')
        .select('file_url')
        .eq('booking_id', bookingId)
        .eq('bag_id', bagId)
        .maybeSingle() as { data: { file_url: string } | null }
      
      if (data) {
        setUploadedPhotos((prev) => ({ ...prev, [bagId]: data.file_url }))
      }
    } catch (err) {
      setBagErrors((prev) => ({ ...prev, [bagId]: err instanceof Error ? err.message : 'Unexpected error.' }))
      setBagStates((prev) => ({ ...prev, [bagId]: 'idle' }))
    }
  }

  // Finalize check-in
  async function handleFinalize() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await finalizeCheckInAction(bookingId)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess('Check-in complete! Booking is now active in storage.')
        setTimeout(() => router.push(`/staff/booking/${bookingId}`), 1500)
      }
    } catch {
      setError('A system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const sealedBags = bags.filter(b => b.seal_status === 'sealed')
  const allUploaded = sealedBags.every(b => uploadedPhotos[b.id])

  return (
    <div className="space-y-6 pb-20">
      {error && (
        <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-green-500/20 border border-green-400/30 rounded-2xl px-4 py-3 text-sm text-green-300">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <div className="space-y-4">
        {bags.map((bag, i) => {
          const isSealed = bag.seal_status === 'sealed'
          const photoPath = uploadedPhotos[bag.id]
          const uploadState = bagStates[bag.id] || 'idle'
          const bagError = bagErrors[bag.id]

          return (
            <div key={bag.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-light">
                    Bag #{i + 1}
                  </span>
                  <p className="font-bold text-sm text-white">
                    {BAG_LABELS[bag.bag_type]}
                  </p>
                  {isSealed ? (
                    <p className="text-xs text-amber-400 font-mono mt-0.5 font-bold">
                      🔒 Seal serial: {bag.seal_number || 'Missing'}
                    </p>
                  ) : (
                    <p className="text-xs text-white/40 italic mt-0.5 font-bold">
                      Unsealable (No seal required)
                    </p>
                  )}
                </div>

                {isSealed && photoPath && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
                    <CheckCircle size={12} /> Uploaded
                  </span>
                )}
              </div>

              {/* Hidden file input for this bag */}
              {isSealed && (
                <input
                  ref={(el) => { fileInputs.current[bag.id] = el }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(bag.id, e)}
                  className="hidden"
                />
              )}

              {/* Error specific to this bag */}
              {bagError && (
                <p className="text-xs font-bold text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {bagError}
                </p>
              )}

              {/* Upload panel state */}
              {isSealed && (
                <div className="pt-2">
                  {photoPath ? (
                    <div className="relative rounded-xl overflow-hidden max-w-sm border border-white/10 bg-black/20 p-2 flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0 text-green-400">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 font-bold truncate">{photoPath.split('/').pop()}</p>
                        <button
                          type="button"
                          onClick={() => handlePickPhoto(bag.id)}
                          className="text-[10px] text-brand hover:underline font-extrabold"
                        >
                          Retake photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {uploadState === 'idle' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePickPhoto(bag.id)}
                          className="border-white/20 text-white hover:bg-white/5"
                        >
                          <Camera size={14} />
                          Capture Seal Photo
                        </Button>
                      )}
                      {(uploadState === 'uploading' || uploadState === 'saving') && (
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Spinner size="sm" className="text-brand-light" />
                          <span>Uploading...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-4">
        <Button
          onClick={handleFinalize}
          disabled={loading || !allUploaded}
          fullWidth
          size="lg"
          className={allUploaded ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold' : 'bg-white/10 text-white/40 cursor-not-allowed'}
        >
          {loading ? <Spinner size="sm" /> : '✓ Finalize Check-In & Move to Storage'}
        </Button>
        {!allUploaded && (
          <p className="text-center text-[10px] text-white/30 font-bold uppercase tracking-wider mt-2.5">
            * All physical zip-locks must be photographed before checkout complete
          </p>
        )}
      </div>
    </div>
  )
}
