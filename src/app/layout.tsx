import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { Cairo, IBM_Plex_Sans_Arabic, Inter, Manrope } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
})

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
})

export const metadata: Metadata = {
  title: 'RoastGrid — Operations',
  description: 'Cafe and gaming operations, in one workspace.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const isRTL = locale === 'ar'

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${ibmPlexArabic.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}
