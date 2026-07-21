import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import SignInForm from './SignInForm'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Coffee, Gamepad2, Sparkles } from 'lucide-react'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (session?.user) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div className="grid min-h-screen bg-[#111923] lg:grid-cols-[1.15fr_0.85fr]">
      <section
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(8,15,24,.2), rgba(8,15,24,.94)), url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=85')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="flex items-center gap-3 text-white">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary"><Coffee className="h-5 w-5" /></div>
          <span className="font-display text-xl font-bold">Caffe YA</span>
        </div>
        <div className="max-w-xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] backdrop-blur">
            <Sparkles className="h-4 w-4 text-emerald-300" /> One operations cockpit
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">Coffee service and gaming sessions, perfectly in sync.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Run the floor, inventory, team, accounting, and every active station from a workspace built for busy shifts.</p>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-300"><Gamepad2 className="h-5 w-5 text-emerald-300" /> Live POS, timed resources, and stock control</div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-white"><Coffee className="h-5 w-5" /></div><span className="font-display text-xl font-bold">Caffe YA</span></div>
            <LanguageSwitcher />
          </div>
          <div className="mb-8">
            <div className="mb-4 hidden justify-end lg:flex"><LanguageSwitcher /></div>
            <p className="mb-2 text-sm font-semibold text-secondary">WELCOME BACK</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface">Sign in to operations</h2>
            <p className="mt-2 text-on-surface-variant">Continue to today&apos;s shift and live floor overview.</p>
          </div>
          <div className="rounded-3xl border border-outline-variant/60 bg-white p-6 shadow-[0_24px_70px_rgba(24,34,48,.12)] sm:p-8">
            <SignInForm locale={locale} />
          </div>
          <p className="mt-5 text-center text-xs text-on-surface-variant">Demo: admin@caffe.ya · CaffeDemo2026!</p>
        </div>
      </section>
    </div>
  )
}
