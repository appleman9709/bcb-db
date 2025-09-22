import { FormEvent, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setError(null)
    setSubmitting(true)

    const result = await signIn({ email: email.trim().toLowerCase(), password })

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    // No need to reset submitting here: the view will switch to the dashboard once session updates.
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-6 py-16 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-purple-500/10" aria-hidden="true" />

        <div className="relative">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            BabyCare
          </div>

          <h1 className="text-3xl font-semibold text-white">Family access</h1>
          <p className="mt-2 text-sm text-slate-200/80">
            Sign in with the credentials shared with your family to manage routines together.
          </p>
        </div>

        <form className="relative mt-10 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-300/50 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/60"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-300/50 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/60"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-slate-200/70">
            Need access? Ask an existing family member to invite you via Supabase dashboard.
          </p>
        </form>
      </div>
    </div>
  )
}
