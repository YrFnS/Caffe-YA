'use server'

import { getSession } from '@/lib/auth'

export async function validateSignInSession() {
  return Boolean(await getSession())
}
