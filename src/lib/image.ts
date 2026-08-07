const REMOTE_IMAGE_HOSTS = new Set(['images.unsplash.com', 'images.pexels.com'])

export function isAllowedImageReference(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !trimmed.includes('://')) return true

  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' && REMOTE_IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export function resolveImageSource(
  value: string | null | undefined,
  folder: 'products' | 'resources',
) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (!trimmed.includes('://')) return `/uploads/${folder}/${trimmed}`
  return isAllowedImageReference(trimmed) ? trimmed : null
}
