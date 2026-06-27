import { z } from 'zod'

export const bagSchema = z.object({
  bag_type: z.enum(['small', 'regular', 'large']),
})

export const createBookingSchema = z.object({
  hub_id: z.string().uuid('Invalid hub'),
  start_time: z.string().datetime({ offset: true }),
  end_time: z.string().datetime({ offset: true }),
  bags: z
    .array(bagSchema)
    .min(1, 'Add at least one bag')
    .max(10, 'Maximum 10 bags per booking'),
  payment_method: z.enum(['pay_online', 'pay_at_hub']).optional(),
  has_insurance: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const start = new Date(data.start_time)
  const end = new Date(data.end_time)
  const now = new Date()

  if (start < new Date(now.getTime() - 5 * 60 * 1000)) {
    ctx.addIssue({ code: 'custom', path: ['start_time'], message: 'Start time must be in the future' })
  }
  if (end <= start) {
    ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'End time must be after start time' })
  }
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  if (hours < 1) {
    ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'Minimum booking duration is 1 hour' })
  }
  if (hours > 72) {
    ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'Maximum booking duration is 72 hours' })
  }
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
