import { type BagType } from '@/types/database'

export const BAG_RATES: Record<BagType, number> = {
  small: 200,    // LKR per hour
  regular: 300,
  large: 400,
}

export const BAG_LABELS: Record<BagType, string> = {
  small: 'Small (Backpack)',
  regular: 'Regular (Cabin Bag)',
  large: 'Large (Check-in Bag)',
}

export function calculateBookingPrice(
  bags: { bag_type: BagType }[],
  startTime: Date,
  endTime: Date
): number {
  const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
  return bags.reduce((total, bag) => total + BAG_RATES[bag.bag_type] * hours, 0)
}

export function calculateLateFee(
  bags: { bag_type: BagType }[],
  endTime: Date,
  now: Date = new Date()
): number {
  const GRACE_PERIOD_MS = 15 * 60 * 1000 // 15 minutes grace period
  if (now.getTime() <= endTime.getTime() + GRACE_PERIOD_MS) return 0
  const overdueHours = Math.ceil((now.getTime() - endTime.getTime()) / (1000 * 60 * 60))
  return bags.reduce((total, bag) => total + BAG_RATES[bag.bag_type] * overdueHours, 0)
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
  totalHourlyBagRate: number
  earlyBufferMinutes?: number
}): EarlyCheckinDecision {
  const {
    bookedStartTime,
    bookedEndTime,
    actualCheckInTime,
    totalHourlyBagRate,
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
  const extraHours = requiresAction ? Math.ceil(earlyMinutes / 60) : 0
  const earlyCheckinFee = extraHours * totalHourlyBagRate

  const originalDurationMs = bookedEndTime.getTime() - bookedStartTime.getTime()
  const shiftedStartTime = actualCheckInTime
  const shiftedEndTime = new Date(actualCheckInTime.getTime() + originalDurationMs)

  return {
    isEarly: true,
    earlyMinutes,
    isWithinBuffer,
    requiresAction,
    extraHours,
    earlyCheckinFee,
    shiftedStartTime,
    shiftedEndTime
  }
}
