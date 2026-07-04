import { type BagType } from '@/types/database'

export const BAG_RATES: Record<BagType, number> = {
  small: 80,     // LKR per hour
  regular: 120,
  large: 150,
}

export const BAG_DAILY_CAPS: Record<BagType, number> = {
  small: 600,    // LKR per 24 hours
  regular: 700,
  large: 800,
}

export const BAG_LABELS: Record<BagType, string> = {
  small: 'Small (Backpack)',
  regular: 'Regular (Cabin Bag)',
  large: 'Large (Check-in Bag)',
}

export function calculateBagPriceForHours(bagType: BagType, hours: number): number {
  if (hours <= 0) return 0
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  const hourlyRate = BAG_RATES[bagType]
  const dailyCap = BAG_DAILY_CAPS[bagType]
  
  const remainingCost = Math.min(remainingHours * hourlyRate, dailyCap)
  return (days * dailyCap) + remainingCost
}

export function calculateBookingPrice(
  bags: { bag_type: BagType }[],
  startTime: Date,
  endTime: Date
): number {
  const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
  return bags.reduce((total, bag) => total + calculateBagPriceForHours(bag.bag_type, hours), 0)
}

export function calculateLateFee(
  bags: { bag_type: BagType }[],
  endTime: Date,
  now: Date = new Date()
): number {
  const GRACE_PERIOD_MS = 15 * 60 * 1000 // 15 minutes grace period
  if (now.getTime() <= endTime.getTime() + GRACE_PERIOD_MS) return 0

  const overdueMs = now.getTime() - endTime.getTime()
  const overdueMinutes = Math.ceil(overdueMs / (60 * 1000))
  const overdueHalfHours = Math.ceil(overdueMinutes / 30)
  const overdueHours = overdueHalfHours * 0.5

  return bags.reduce((total, bag) => total + calculateBagPriceForHours(bag.bag_type, overdueHours), 0)
}

export interface EarlyCheckinDecision {
  isEarly: boolean
  earlyMinutes: number
  isWithinBuffer: boolean
  requiresAction: boolean
  extraHours: number
  earlyCheckinFee: number
  shiftedStartTime: Date
  shiftedEndTime: Date
}

export function calculateEarlyCheckinDecision(params: {
  bookedStartTime: Date
  bookedEndTime: Date
  actualCheckInTime: Date
  bags: { bag_type: BagType }[]
  earlyBufferMinutes?: number
}): EarlyCheckinDecision {
  const {
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime,
    bags,
    earlyBufferMinutes = 15
  } = params

  const earlyMs = bookedStartTime.getTime() - actualCheckInTime.getTime()
  const earlyMinutes = Math.ceil(earlyMs / (60 * 1000))

  if (earlyMinutes <= 0) {
    return {
      isEarly: false,
      earlyMinutes: 0,
      isWithinBuffer: true,
      requiresAction: false,
      extraHours: 0,
      earlyCheckinFee: 0,
      shiftedStartTime: bookedStartTime,
      shiftedEndTime: bookedEndTime
    }
  }

  const isWithinBuffer = earlyMinutes <= earlyBufferMinutes
  const requiresAction = !isWithinBuffer
  
  // Calculate based on 30-minute blocks (half-hourly billing)
  const extraHalfHours = requiresAction ? Math.ceil(earlyMinutes / 30) : 0
  const extraHours = extraHalfHours * 0.5
  
  const earlyCheckinFee = bags.reduce((total, bag) => total + calculateBagPriceForHours(bag.bag_type, extraHours), 0)
  const extraHoursInt = Math.ceil(earlyMinutes / 60) // Keep integer for DB compatibility

  const originalDurationMs = bookedEndTime.getTime() - bookedStartTime.getTime()
  const shiftedStartTime = actualCheckInTime
  const shiftedEndTime = new Date(actualCheckInTime.getTime() + originalDurationMs)

  return {
    isEarly: true,
    earlyMinutes,
    isWithinBuffer,
    requiresAction,
    extraHours: extraHoursInt,
    earlyCheckinFee,
    shiftedStartTime,
    shiftedEndTime
  }
}
