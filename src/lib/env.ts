import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
})

// For build time, provide placeholder values
const isBuildTime = process.env.NODE_ENV === 'test' || process.env.NEXT_PHASE === 'phase-production-build'

let envData: z.infer<typeof envSchema>

if (isBuildTime) {
  envData = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'placeholder-secret-for-build-time-only-32chars',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  }
} else {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment configuration')
  }
  envData = parsed.data
}

export const env = envData