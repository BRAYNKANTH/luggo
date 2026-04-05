import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  phone: z
    .string()
    .regex(/^(\+94|0)[0-9]{9}$/, 'Enter a valid Sri Lankan phone number')
    .optional()
    .or(z.literal('')),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .regex(/^(\+94|0)[0-9]{9}$/, 'Enter a valid Sri Lankan phone number')
    .optional()
    .or(z.literal('')),
  nic_passport: z
    .string()
    .min(5, 'Enter a valid NIC or passport number')
    .max(20)
    .optional()
    .or(z.literal('')),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
