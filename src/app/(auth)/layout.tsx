import { redirect } from 'next/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  redirect('/en')
}