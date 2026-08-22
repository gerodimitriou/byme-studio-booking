import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { verifyMemberLogin } from '../lib/members.js'
import { BymeLogo } from '../lib/Logo.jsx'

export const ME_KEY = 'me_auth'

const iCls = 'w-full bg-ink/40 border border-bone/[0.15] hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-bone placeholder:text-bone/30 rounded-sm px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200 min-h-[48px]'
const lCls = 'block text-[10px] font-sans font-medium text-bronze tracking-[0.25em] uppercase mb-2'

export default function MeLogin() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (localStorage.getItem(ME_KEY)) navigate('/me', { replace: true })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.code) { setError('Συμπλήρωσε email και κωδικό.'); return }
    setLoading(true); setError('')
    const data = await verifyMemberLogin(form.email, form.code)
    if (data === 'locked') {
      setError('Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά.')
    } else if (!data) {
      setError('Λάθος email ή κωδικός. Επικοινώνησε με το studio.')
    } else {
      localStorage.setItem(ME_KEY, JSON.stringify(data))
      navigate('/me', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12 bg-ink overflow-hidden">
      {/* Decorative backdrop */}
      <div className="pointer-events-none absolute inset-0" style={{ willChange: 'transform' }}>
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-bronze/[0.08] blur-[80px]" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-amber/[0.05] blur-[80px]" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <BymeLogo size="md" className="text-bone mb-6" />
          <p className="text-bronze text-[10px] font-sans tracking-[0.35em] uppercase">Member Portal</p>
          <h1 className="font-serif text-3xl text-bone italic mt-3">Καλώς ήρθες πίσω.</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={lCls}>Email</label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="email@example.com"
              className={iCls}
            />
          </div>
          <div>
            <label className={lCls}>Κωδικός</label>
            <input
              value={form.code}
              autoCorrect="off"
              spellCheck="false"
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="Κωδικός πρόσβασης"
              className={iCls}
            />
          </div>

          {error && (
            <p className="text-ember text-sm bg-ember/[0.08] border border-ember/30 rounded-sm px-4 py-3 font-sans">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]"
          >
            {loading ? 'Σύνδεση…' : 'Σύνδεση'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link to="/" className="text-bone/55 hover:text-bone text-[10px] font-sans tracking-[0.3em] uppercase transition-colors">
            ← Πίσω στο site
          </Link>
        </div>
      </div>
    </div>
  )
}
