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
