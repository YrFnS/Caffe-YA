import { redirect } from 'next/navigation'

export default function AuthLayout({
  children: _children, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  children: React.ReactNode
}) {
  redirect('/en')
}