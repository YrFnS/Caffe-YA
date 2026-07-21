export { formatCurrency as formatIQD } from './currency'

const BAGHDAD_TIME_ZONE = 'Asia/Baghdad'

export function formatDate(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-IQ', {
    dateStyle: 'medium',
    timeZone: BAGHDAD_TIME_ZONE,
  }).format(new Date(value))
}

export function formatDateTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-IQ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BAGHDAD_TIME_ZONE,
  }).format(new Date(value))
}

export function formatTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-IQ', {
    timeStyle: 'short',
    timeZone: BAGHDAD_TIME_ZONE,
  }).format(new Date(value))
}
