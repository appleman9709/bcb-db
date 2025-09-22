import { FormEvent, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Family, FamilyMember } from '../services/dataService'

export default function AuthPage() {
  const { findFamilyByName, selectMember } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [step, setStep] = useState<'family' | 'member'>('family')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => (a.role ?? '').localeCompare(b.role ?? ''))
  }, [members])

  const handleFamilySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!familyName.trim()) {
      setError('Please enter a family name')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await findFamilyByName(familyName)

    if ('error' in result) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setFamily(result.family)
    setMembers(result.members)
    setSubmitting(false)
    setStep('member')
  }

  const handleSelectMember = (member: FamilyMember) => {
    if (!family) {
      return
    }

    selectMember(family, member)
  }

  const handleGuestEntry = () => {
    if (!family) {
      return
    }

    const guestMember: FamilyMember = {
      family_id: family.id,
      user_id: `${family.id}-guest`,
      role: 'Guest',
      name: 'Guest',
      created_at: new Date().toISOString()
    }

    selectMember(family, guestMember)
  }

  const goBack = () => {
    setStep('family')
    setMembers([])
    setFamily(null)
    setError(null)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-6 py-16 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-purple-500/10" aria-hidden="true" />

        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            BabyCare
          </div>

          <h1 className="text-3xl font-semibold text-white">Welcome</h1>
          <p className="text-sm text-slate-200/80">
            Enter your family name and then choose your role.
          </p>
        </div>

        {step === 'family' && (
          <form className="relative mt-10 space-y-5" onSubmit={handleFamilySubmit}>
            <div className="space-y-2">
              <label htmlFor="family-name" className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">
                Family
              </label>
              <input
                id="family-name"
                type="text"
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-300/50 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/60"
                placeholder="Example: The Ivanov family"
                autoFocus
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
              {submitting ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'member' && family && (
          <div className="relative mt-8 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">Family</p>
              <p className="mt-1 text-lg font-semibold text-white">{family.name}</p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {sortedMembers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-200/80">Pick your role:</p>
                <div className="grid gap-3">
                  {sortedMembers.map(memberOption => (
                    <button
                      key={`${memberOption.user_id}-${memberOption.role}`}
                      type="button"
                      onClick={() => handleSelectMember(memberOption)}
                      className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left transition hover:border-sky-400/50 hover:bg-white/15"
                    >
                      <span className="text-sm font-semibold text-white">{memberOption.role ?? 'Family member'}</span>
                      {memberOption.name && (
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-200/70">{memberOption.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                No roles are configured for this family yet. You can join as a guest.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goBack}
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleGuestEntry}
                className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50"
              >
                Continue as guest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

