import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root: process.cwd() },
}

export default withNextIntl(nextConfig)
