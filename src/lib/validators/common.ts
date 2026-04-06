import { z } from 'zod'

export const uuidSchema = z.string().uuid('Invalid ID format')

export const statusSchema = (allowed: string[]) => 
  z.string().refine(val => allowed.includes(val), {
    message: `Invalid status. Must be one of: ${allowed.join(', ')}`
  })

export const capacitySchema = z.number().int().min(1).max(1000)

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
})
