'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowRight, BadgeAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createWalkInBooking } from '@/lib/staff/actions'
import { type BagType } from '@/types/database'

interface WalkInFormProps {
  hubId: string
}

interface BagItem {
  id: string
  type: BagType
}

export function WalkInForm({ hubId }: WalkInFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nicPassport, setNicPassport] = useState('')
  const [expectedPickup, setExpectedPickup] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pay_online' | 'pay_at_hub'>('pay_at_hub')
  
  const [bags, setBags] = useState<BagItem[]>([
    { id: '1', type: 'regular' }
  ])

  const [estimatedHours, setEstimatedHours] = useState(0)
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Pricing preview calculation
  useEffect(() => {
    if (!expectedPickup) {
      setEstimatedHours(0)
      setEstimatedPrice(0)
      return
    }

    const now = new Date()
    const pickup = new Date(expectedPickup)
    if (pickup <= now) {
      setEstimatedHours(0)
      setEstimatedPrice(0)
      return
    }

    const hours = Math.max(1, Math.ceil((pickup.getTime() - now.getTime()) / (1000 * 60 * 60)))
    const rates = { small: 200, regular: 300, large: 400 }
    const totalBagPrice = bags.reduce((sum, b) => sum + (rates[b.type] || 300), 0)
    
    setEstimatedHours(hours)
    setEstimatedPrice(totalBagPrice * hours)
  }, [expectedPickup, bags])

  function addBag() {
    setBags([...bags, { id: Date.now().toString(), type: 'regular' }])
  }

  function removeBag(id: string) {
    if (bags.length === 1) return
    setBags(bags.filter((b) => b.id !== id))
  }

  function updateBagType(id: string, type: BagType) {
    setBags(bags.map((b) => (b.id === id ? { ...b, type } : b)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic Validation
    if (!name.trim()) {
      setError('Customer name is required.')
      setLoading(false)
      return
    }
    if (!phone.trim() || phone.length < 9) {
      setError('A valid customer phone number is required.')
      setLoading(false)
      return
    }
    if (!nicPassport.trim()) {
      setError('NIC or Passport reference is required for identity tracking.')
      setLoading(false)
      return
    }
    if (!expectedPickup) {
      setError('Expected pickup date and time is required.')
      setLoading(false)
      return
    }

    const pickupDate = new Date(expectedPickup)
    if (pickupDate <= new Date()) {
      setError('Expected pickup time must be in the future.')
      setLoading(false)
      return
    }

    try {
      const bagTypes = bags.map((b) => b.type)
      const result = await createWalkInBooking({
        name,
        phone,
        nicPassportRef: nicPassport,
        bagCount: bags.length,
        bagTypes,
        expectedPickupTime: pickupDate.toISOString(),
        paymentMethod,
        hubId
      })

      if (result.error || !result.bookingId) {
        setError(result.error || 'Failed to create booking.')
      } else {
        router.push(`/staff/booking/${result.bookingId}/bags`)
      }
    } catch {
      setError('A server error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-200">
          <BadgeAlert size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Customer Information */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-light">Customer Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer full name..."
              className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Phone Number (LK)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567 or +94771234567..."
              className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">NIC / Passport Number</label>
          <input
            type="text"
            required
            value={nicPassport}
            onChange={(e) => setNicPassport(e.target.value.toUpperCase())}
            placeholder="Enter NIC, passport or ID reference..."
            className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent uppercase font-mono"
          />
        </div>
      </div>

      {/* Bag Selection */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-brand-light">Luggage Details</h3>
          <button
            type="button"
            onClick={addBag}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus size={14} />
            Add Bag
          </button>
        </div>

        <div className="space-y-3">
          {bags.map((bag, index) => (
            <div key={bag.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-white/50 w-12 shrink-0">Bag #{index + 1}</span>
              <select
                value={bag.type}
                onChange={(e) => updateBagType(bag.id, e.target.value as BagType)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:outline-none"
              >
                <option value="small" className="bg-ocean-900">Laptop / Handbag (LKR 200/h)</option>
                <option value="regular" className="bg-ocean-900">Backpack / regular Suitcase (LKR 300/h)</option>
                <option value="large" className="bg-ocean-900">Large Suitcase / Duffel (LKR 400/h)</option>
              </select>
              {bags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBag(bag.id)}
                  className="text-white/40 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Storage Duration */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-brand-light">Duration & Payment</h3>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Expected Collection Time</label>
          <input
            type="datetime-local"
            required
            value={expectedPickup}
            onChange={(e) => setExpectedPickup(e.target.value)}
            min={(() => {
              const now = new Date()
              const tzOffset = now.getTimezoneOffset() * 60000
              return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
            })()}
            className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-transparent"
          />
        </div>

        {/* Pricing Estimator Preview */}
        {estimatedHours > 0 && (
          <div className="bg-brand-light/10 border border-brand-light/20 p-4 rounded-xl space-y-2 text-brand-light text-xs font-bold leading-normal">
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{estimatedHours} hours</span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-white/10">
              <span>Total Price (LKR):</span>
              <span>LKR {estimatedPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Payment Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('pay_at_hub')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center ${
                paymentMethod === 'pay_at_hub'
                  ? 'bg-brand-light/20 border-brand-light text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              Cash Collected at Hub
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('pay_online')}
              className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center ${
                paymentMethod === 'pay_online'
                  ? 'bg-brand-light/20 border-brand-light text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              Generate PayOnline Link
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <span className="flex items-center gap-1.5 justify-center">
              <Spinner size="sm" />
              Creating Booking…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 justify-center">
              Create & Continue
              <ArrowRight size={16} />
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
