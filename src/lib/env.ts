import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  DEMO_MODE: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
})

// Build and test commands can validate the application without production secrets.
const isBuildTime = process.env.NODE_ENV === 'test' || process.env.NEXT_PHASE === 'phase-production-build'

let envData: z.infer<typeof envSchema>

if (isBuildTime) {
  envData = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || 'placeholder-secret-for-build-time-only-32chars',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    DEMO_MODE: process.env.DEMO_MODE === 'true',
  }
} else {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment configuration')
  }
  envData = parsed.data
}

export const env = envData
