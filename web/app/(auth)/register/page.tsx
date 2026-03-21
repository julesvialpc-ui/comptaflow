'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiRegister } from '@/lib/auth';

interface FieldErrors {
  email?: string;
  password?: string;
  businessName?: string;
}

function validatePassword(p: string): string | undefined {
  if (p.length < 8) return 'Minimum 8 caractères';
  if (!/[A-Z]/.test(p)) return 'Au moins une majuscule';
  if (!/[0-9]/.test(p)) return 'Au moins un chiffre';
}

export default function RegisterPage() {
  const { setAuth } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const strength = !password ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : validatePassword(password) ? 3 : 4;
  const strengthColor = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E'];

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Adresse e-mail invalide';
    const pwdErr = validatePassword(password);
    if (pwdErr) errors.password = pwdErr;
    if (!businessName.trim()) errors.businessName = 'Le nom de votre entreprise est requis';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await apiRegister({ email, password, name: name || undefined, businessName });
      setAuth(user, { accessToken, refreshToken });
      router.push('/dashboard');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
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
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium mb-3" style={{ background: '#EAF3DE', color: '#3B6D11' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2 2 5-4.5" stroke="#3B6D11" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gratuit · Aucune carte bancaire requise
          </div>
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
          <div className="flex mb-6" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
            <span
              className="pb-2.5 mr-5 text-[14px] font-medium"
              style={{ color: '#185FA5', borderBottom: '2px solid #378ADD' }}
            >
              Créer un compte
            </span>
            <Link
              href="/login"
              className="pb-2.5 text-[14px]"
              style={{ color: '#888780', borderBottom: '2px solid transparent' }}
            >
              Se connecter
            </Link>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium mb-4" style={{ background: '#EAF3DE', color: '#3B6D11' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2 2 5-4.5" stroke="#3B6D11" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gratuit · Aucune carte bancaire requise
          </div>

          <p className="text-[18px] font-medium mb-1" style={{ color: '#1a1a18' }}>Créez votre compte</p>
          <p className="text-[13px] mb-5" style={{ color: '#888780' }}>Prêt en 2 minutes, sans engagement</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px]" style={{ color: '#888780' }}>Prénom</label>
                <input
                  type="text"
                  placeholder="Marie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                  style={{ border: '0.5px solid #E5E4E0', background: '#F8F8F7', color: '#1a1a18' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#378ADD'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E4E0'; }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px]" style={{ color: '#888780' }}>E-mail <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: undefined })); }}
                  autoComplete="email"
                  className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                  style={{ border: `0.5px solid ${fieldErrors.email ? '#EF4444' : '#E5E4E0'}`, background: '#F8F8F7', color: '#1a1a18' }}
                  onFocus={e => { e.currentTarget.style.borderColor = fieldErrors.email ? '#EF4444' : '#378ADD'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.email ? '#EF4444' : '#E5E4E0'; }}
                />
                {fieldErrors.email && <p className="text-[11px]" style={{ color: '#EF4444' }}>{fieldErrors.email}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px]" style={{ color: '#888780' }}>Nom de votre entreprise <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="text"
                placeholder="Marie Dupont Conseil"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setFieldErrors(f => ({ ...f, businessName: undefined })); }}
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                style={{ border: `0.5px solid ${fieldErrors.businessName ? '#EF4444' : '#E5E4E0'}`, background: '#F8F8F7', color: '#1a1a18' }}
                onFocus={e => { e.currentTarget.style.borderColor = fieldErrors.businessName ? '#EF4444' : '#378ADD'; }}
                onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.businessName ? '#EF4444' : '#E5E4E0'; }}
              />
              {fieldErrors.businessName && <p className="text-[11px]" style={{ color: '#EF4444' }}>{fieldErrors.businessName}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px]" style={{ color: '#888780' }}>Mot de passe <span style={{ color: '#EF4444' }}>*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: undefined })); }}
                  autoComplete="new-password"
                  className="w-full rounded-md px-3 py-2 pr-9 text-[13px] outline-none"
                  style={{ border: `0.5px solid ${fieldErrors.password ? '#EF4444' : '#E5E4E0'}`, background: '#F8F8F7', color: '#1a1a18' }}
                  onFocus={e => { e.currentTarget.style.borderColor = fieldErrors.password ? '#EF4444' : '#378ADD'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = fieldErrors.password ? '#EF4444' : '#E5E4E0'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#888780' }}
                  tabIndex={-1}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              {password && (
                <div className="flex gap-1 mt-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: strength >= i ? strengthColor[strength] : '#E5E4E0' }} />
                  ))}
                </div>
              )}
              {fieldErrors.password && <p className="text-[11px]" style={{ color: '#EF4444' }}>{fieldErrors.password}</p>}
            </div>

            {globalError && (
              <div className="flex items-center gap-2 rounded-md px-3 py-2.5" style={{ background: '#FEF2F2', border: '0.5px solid #FECACA' }}>
                <svg className="h-4 w-4 flex-shrink-0" style={{ color: '#DC2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[12px]" style={{ color: '#DC2626' }}>{globalError}</p>
              </div>
            )}

            <p className="text-[11px]" style={{ color: '#888780' }}>
              En créant un compte, vous acceptez nos{' '}
              <a href="#" style={{ color: '#378ADD' }}>CGU</a>
              {' '}et notre{' '}
              <a href="#" style={{ color: '#378ADD' }}>politique de confidentialité</a>.
            </p>

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
                  Création du compte…
                </span>
              ) : 'Créer mon compte gratuit'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px]" style={{ color: '#888780' }}>
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium" style={{ color: '#378ADD' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
