'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
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

  // Password strength
  const strength = !password ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : validatePassword(password) ? 3
    : 4;

  const strengthLabel = ['', 'Très faible', 'Faible', 'Acceptable', 'Fort'];
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];

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
      const { user, accessToken, refreshToken } = await apiRegister({
        email,
        password,
        name: name || undefined,
        businessName,
      });
      setAuth(user, { accessToken, refreshToken });
      router.push('/dashboard');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-zinc-500">Commencez gratuitement, sans carte bancaire</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name + Email */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="name"
            label="Prénom"
            placeholder="Marie"
            value={name}
            onChange={setName}
            autoComplete="given-name"
          />
          <FormField
            id="email"
            label="E-mail"
            type="email"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(v) => { setEmail(v); setFieldErrors((f) => ({ ...f, email: undefined })); }}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />
        </div>

        {/* Business name */}
        <FormField
          id="businessName"
          label="Nom de votre entreprise"
          placeholder="Marie Dupont Conseil"
          value={businessName}
          onChange={(v) => { setBusinessName(v); setFieldErrors((f) => ({ ...f, businessName: undefined })); }}
          error={fieldErrors.businessName}
          required
        />

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Strength indicator */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      strength >= i ? strengthColor[strength] : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${strength >= 4 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {strengthLabel[strength]}
              </p>
            </div>
          )}
          {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        {/* Global error */}
        {globalError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-700">{globalError}</p>
          </div>
        )}

        {/* Terms */}
        <p className="text-xs text-zinc-400">
          En créant un compte, vous acceptez nos{' '}
          <a href="#" className="text-indigo-600 hover:underline">conditions d&apos;utilisation</a>
          {' '}et notre{' '}
          <a href="#" className="text-indigo-600 hover:underline">politique de confidentialité</a>.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Création du compte…
            </span>
          ) : (
            'Créer mon compte'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
