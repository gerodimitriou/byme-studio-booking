import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { BymeLogo } from '../lib/Logo.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Συμπλήρωσε email και κωδικό.'); return }
    setLoading(true); setError('')
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (authErr) {
      setError('Λάθος email ή κωδικός.')
      setLoading(false)
    } else {
      navigate('/admin', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <BymeLogo size="lg" className="text-bone" />
        </div>

        <div className="bg-coal border border-bone/[0.1] rounded-sm p-8">
          <p className="text-bronze text-xs font-sans tracking-[0.3em] uppercase mb-2">Admin</p>
          <h1 className="text-bone text-3xl font-serif italic mb-8">Σύνδεση</h1>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-[10px] font-sans tracking-[0.25em] uppercase text-bronze mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="w-full bg-ink/40 border border-bone/[0.15] hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-bone placeholder:text-bone/30 rounded-sm px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-sans tracking-[0.25em] uppercase text-bronze mb-2">
                Κωδικός
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-ink/40 border border-bone/[0.15] hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-bone placeholder:text-bone/30 rounded-sm px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200"
              />
            </div>

            {error && (
              <p className="text-ember text-sm bg-ember/[0.08] border border-ember/30 rounded-sm px-4 py-3" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer mt-2"
            >
              {loading ? 'Σύνδεση…' : 'Είσοδος'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
