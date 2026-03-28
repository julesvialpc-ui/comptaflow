'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiLogin } from '@/lib/auth';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await apiLogin({ email, password });
      setAuth(user, { accessToken, refreshToken });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Mobile hero top ── */}
      <div
        className="lg:hidden relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #378ADD 100%)', minHeight: 220 }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="absolute top-8 right-20 h-6 w-6 rounded-full opacity-20" style={{ background: '#fff' }} />

        <div className="relative px-6 pt-12 pb-14">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10a7 7 0 1 1 14 0A7 7 0 0 1 3 10z" fill="rgba(255,255,255,0.9)" />
                <path d="M7 10l2 2 4-4" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[22px] font-semibold tracking-tight text-white">Konta</span>
          </div>

          <p className="text-[24px] font-semibold leading-tight text-white mb-2">
            Bon retour 👋
          </p>
          <p className="text-[14px] text-white/70">
            Votre compta vous attend
          </p>
        </div>
      </div>

      {/* ── Desktop left panel ── */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[500px] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0C447C 0%, #185FA5 60%, #2E7FC4 100%)' }}
      >
        {/* Decorative */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="absolute bottom-20 -left-16 h-48 w-48 rounded-full opacity-10" style={{ background: '#fff' }} />

        <div className="relative flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10a7 7 0 1 1 14 0A7 7 0 0 1 3 10z" fill="rgba(255,255,255,0.9)" />
              <path d="M7 10l2 2 4-4" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[22px] font-semibold tracking-tight text-white">Konta</span>
        </div>

        <div className="relative">
          <p className="text-[28px] font-bold leading-tight text-white mb-3">
            La compta qui se fait<br />toute seule
          </p>
          <p className="text-[14px] text-white/70 mb-8">
            Rejoignez les freelances qui ont repris le contrôle de leur comptabilité.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: '⚡', text: 'Factures & devis en 30 secondes' },
              { icon: '🤖', text: 'Assistant IA disponible 24h/24' },
              { icon: '📊', text: 'URSSAF calculée automatiquement' },
              { icon: '💰', text: 'Tableau de bord financier en temps réel' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[14px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {item.icon}
                </div>
                <span className="text-[13px] text-white/85">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#FCD34D"><path d="M6 1l1.24 2.51L10 3.93l-2 1.95.47 2.75L6 7.51l-2.47 1.12.47-2.75-2-1.95 2.76-.42z"/></svg>
            ))}
          </div>
          <p className="text-[13px] italic leading-relaxed mb-3 text-white/85">
            &ldquo;En 10 minutes j&apos;avais tout configuré. Konta a changé ma façon de gérer mon activité.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              SC
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">Sarah C.</p>
              <p className="text-[11px] text-white/60">Graphiste freelance · Paris</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel / Mobile form card ── */}
      <div className="flex flex-1 items-center justify-center lg:p-8" style={{ background: '#FAFAF9' }}>
        {/* Mobile: card that overlaps the hero */}
        <div
          className="w-full lg:max-w-sm lg:rounded-2xl lg:shadow-none"
          style={{ marginTop: -24 }}
        >
          <div
            className="rounded-t-3xl lg:rounded-2xl px-6 pt-7 pb-8 lg:px-8 lg:pt-8 lg:pb-8"
            style={{ background: '#fff', boxShadow: '0 -2px 20px rgba(0,0,0,0.06)' }}
          >
            {/* Desktop logo (hidden on mobile, shown on desktop only if lg panel not visible) */}
            <div className="hidden lg:flex items-center gap-2 mb-8">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#E6F1FB' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10a7 7 0 1 1 14 0A7 7 0 0 1 3 10z" fill="#378ADD" />
                  <path d="M7 10l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[18px] font-semibold tracking-tight" style={{ color: '#185FA5' }}>Konta</span>
            </div>

            {/* Tabs */}
            <div className="flex mb-6" style={{ borderBottom: '1px solid #F0EFEB' }}>
              <Link
                href="/register"
                className="pb-3 mr-6 text-[14px] font-medium transition-colors"
                style={{ color: '#B0AFA9', borderBottom: '2px solid transparent' }}
              >
                Créer un compte
              </Link>
              <span
                className="pb-3 text-[14px] font-semibold"
                style={{ color: '#185FA5', borderBottom: '2px solid #378ADD' }}
              >
                Se connecter
              </span>
            </div>

            <p className="text-[20px] font-bold mb-1" style={{ color: '#1a1a18' }}>Connexion</p>
            <p className="text-[13px] mb-7" style={{ color: '#888780' }}>Accédez à votre espace comptable</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium" style={{ color: '#555450' }}>Adresse email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12v8H2V4z" stroke="#C0BFB9" strokeWidth="1.2" strokeLinejoin="round"/>
                      <path d="M2 4l6 5 6-5" stroke="#C0BFB9" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="vous@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl pl-9 pr-3 py-3 text-[14px] outline-none transition-all"
                    style={{ border: '1.5px solid #E8E7E3', background: '#F8F8F6', color: '#1a1a18' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E8E7E3'; e.currentTarget.style.background = '#F8F8F6'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium" style={{ color: '#555450' }}>Mot de passe</label>
                  <a href="#" className="text-[12px] font-medium" style={{ color: '#378ADD' }}>Oublié ?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#C0BFB9" strokeWidth="1.2"/>
                      <path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="#C0BFB9" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl pl-9 pr-10 py-3 text-[14px] outline-none transition-all"
                    style={{ border: '1.5px solid #E8E7E3', background: '#F8F8F6', color: '#1a1a18' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E8E7E3'; e.currentTarget.style.background = '#F8F8F6'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="#C0BFB9" strokeWidth="1.2"/>
                        <circle cx="8" cy="8" r="1.5" stroke="#C0BFB9" strokeWidth="1.2"/>
                        <path d="M3 3l10 10" stroke="#C0BFB9" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="#C0BFB9" strokeWidth="1.2"/>
                        <circle cx="8" cy="8" r="1.5" stroke="#C0BFB9" strokeWidth="1.2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <svg className="h-4 w-4 flex-shrink-0" style={{ color: '#DC2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-[14px] font-semibold transition-all disabled:opacity-60 mt-1"
                style={{ background: 'linear-gradient(135deg, #185FA5 0%, #378ADD 100%)', color: '#fff', boxShadow: '0 4px 12px rgba(55,138,221,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connexion…
                  </span>
                ) : 'Se connecter →'}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px]" style={{ color: '#888780' }}>
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-semibold" style={{ color: '#378ADD' }}>
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
