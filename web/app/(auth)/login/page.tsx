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
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10" style={{ background: '#E6F1FB' }}>
        <div className="text-[22px] font-medium tracking-tight">
          <span style={{ color: '#185FA5' }}>Ko</span><span style={{ color: '#378ADD' }}>nta</span>
        </div>

        <div>
          <p className="text-[20px] font-medium leading-snug mb-3" style={{ color: '#0C447C' }}>
            La compta qui se fait<br />toute seule
          </p>
          <p className="text-[13px] leading-relaxed mb-8" style={{ color: '#185FA5' }}>
            Rejoignez les freelances qui ont repris le contrôle de leur comptabilité.
          </p>
          <div className="flex flex-col gap-3">
            {[
              'Factures & devis en 30 secondes',
              'Assistant IA disponible 24h/24',
              'URSSAF calculée automatiquement',
              'Tableau de bord financier en temps réel',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md" style={{ background: '#B5D4F4' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l2.5 2.5 5.5-5.5" stroke="#0C447C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[13px]" style={{ color: '#185FA5' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: '#B5D4F4' }}>
          <p className="text-[12px] italic leading-relaxed mb-3" style={{ color: '#0C447C' }}>
            &ldquo;En 10 minutes j&apos;avais tout configuré. Konta a changé ma façon de gérer mon activité.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: '#378ADD', color: '#E6F1FB' }}>
              SC
            </div>
            <div>
              <p className="text-[12px] font-medium" style={{ color: '#0C447C' }}>Sarah C.</p>
              <p className="text-[11px]" style={{ color: '#185FA5' }}>Graphiste freelance · Paris</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6" style={{ background: '#FFFFFF' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-[22px] font-medium tracking-tight">
            <span style={{ color: '#185FA5' }}>Ko</span><span style={{ color: '#378ADD' }}>nta</span>
          </div>

          {/* Tabs */}
          <div className="flex mb-7" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
            <Link
              href="/register"
              className="pb-2.5 mr-5 text-[14px] font-medium"
              style={{ color: '#888780', borderBottom: '2px solid transparent' }}
            >
              Créer un compte
            </Link>
            <span
              className="pb-2.5 text-[14px] font-medium"
              style={{ color: '#185FA5', borderBottom: '2px solid #378ADD' }}
            >
              Se connecter
            </span>
          </div>

          <p className="text-[18px] font-medium mb-1" style={{ color: '#1a1a18' }}>Bon retour 👋</p>
          <p className="text-[13px] mb-6" style={{ color: '#888780' }}>Connectez-vous à votre espace comptable</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px]" style={{ color: '#888780' }}>Adresse email</label>
              <input
                type="email"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-colors"
                style={{ border: '0.5px solid #E5E4E0', background: '#F8F8F7', color: '#1a1a18' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; e.currentTarget.style.outline = 'none'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E5E4E0'; }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px]" style={{ color: '#888780' }}>Mot de passe</label>
                <a href="#" className="text-[12px]" style={{ color: '#378ADD' }}>Mot de passe oublié ?</a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-colors"
                style={{ border: '0.5px solid #E5E4E0', background: '#F8F8F7', color: '#1a1a18' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E5E4E0'; }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md px-3 py-2.5" style={{ background: '#FEF2F2', border: '0.5px solid #FECACA' }}>
                <svg className="h-4 w-4 flex-shrink-0" style={{ color: '#DC2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-2.5 text-[14px] font-medium transition-opacity disabled:opacity-60"
              style={{ background: '#378ADD', color: '#E6F1FB' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px]" style={{ color: '#888780' }}>
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-medium" style={{ color: '#378ADD' }}>
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
