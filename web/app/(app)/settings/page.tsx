'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import {
  apiGetProfile,
  apiUpdateProfile,
  apiChangePassword,
  apiGetBusiness,
  apiUpdateBusiness,
  BusinessPayload,
} from '@/lib/settings';
import { Business, BusinessType, Subscription } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'AUTO_ENTREPRENEUR', label: 'Auto-entrepreneur / Micro-entrepreneur' },
  { value: 'EI',   label: 'Entreprise individuelle (EI)' },
  { value: 'EIRL', label: 'EIRL' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SARL', label: 'SARL' },
  { value: 'SAS',  label: 'SAS' },
  { value: 'SASU', label: 'SASU' },
  { value: 'SA',   label: 'SA' },
  { value: 'OTHER', label: 'Autre' },
];

const PLAN_META: Record<string, { label: string; color: string; features: string[] }> = {
  FREE: {
    label: 'Gratuit',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    features: ['5 factures / mois', '10 clients', 'Dashboard basique', 'Export PDF'],
  },
  STARTER: {
    label: 'Starter',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    features: ['50 factures / mois', 'Clients illimités', 'Rapports fiscaux', 'Assistant IA (limité)'],
  },
  PRO: {
    label: 'Pro',
    color: 'bg-[#E6F1FB] text-[#378ADD] border-[#378ADD]',
    features: ['Factures illimitées', 'Assistant IA complet', 'Multi-utilisateurs (2)', 'Support prioritaire'],
  },
  BUSINESS: {
    label: 'Business',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    features: ['Tout Pro +', 'Multi-utilisateurs illimité', 'API access', 'Gestionnaire dédié'],
  },
};

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',      label: 'Profil' },
  { id: 'business',     label: 'Entreprise' },
  { id: 'subscription', label: 'Abonnement' },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-zinc-900 mb-4">{children}</h2>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        disabled:bg-zinc-50 disabled:text-zinc-400 ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${props.className ?? ''}`}
    />
  );
}

function SaveButton({ loading, label = 'Enregistrer' }: { loading?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-5 py-2 text-sm font-semibold text-white
        hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {label}
    </button>
  );
}

function Alert({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm border ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ token }: { token: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiGetProfile(token).then((p) => {
      setName(p.name ?? '');
      setEmail(p.email);
    }).catch(() => {});
  }, [token]);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      await apiUpdateProfile(token, { name: name.trim() || undefined });
      setAlert({ type: 'success', msg: 'Profil mis à jour.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setAlert({ type: 'error', msg: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    if (newPwd.length < 8) {
      setAlert({ type: 'error', msg: 'Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    setSavingPwd(true);
    setAlert(null);
    try {
      const res = await apiChangePassword(token, { currentPassword: currentPwd, newPassword: newPwd });
      setAlert({ type: 'success', msg: res.message });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Identity */}
      <form onSubmit={handleProfile} className="space-y-4">
        <SectionTitle>Identité</SectionTitle>
        <Field label="Nom d'affichage">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" />
        </Field>
        <Field label="Adresse e-mail" hint="Modification de l'e-mail non disponible pour l'instant.">
          <Input value={email} disabled />
        </Field>
        <div className="pt-1">
          <SaveButton loading={saving} />
        </div>
      </form>

      <hr className="border-zinc-100" />

      {/* Password */}
      <form onSubmit={handlePassword} className="space-y-4">
        <SectionTitle>Changer le mot de passe</SectionTitle>
        <Field label="Mot de passe actuel">
          <Input
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum.">
          <Input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <Input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <div className="pt-1">
          <SaveButton loading={savingPwd} label="Changer le mot de passe" />
        </div>
      </form>
    </div>
  );
}

// ─── Business tab ─────────────────────────────────────────────────────────────

function BusinessTab({ token }: { token: string }) {
  const [form, setForm] = useState<BusinessPayload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiGetBusiness(token).then((b) => {
      if (b) {
        setForm({
          name: b.name,
          type: b.type,
          siret: b.siret ?? '',
          siren: b.siren ?? '',
          vatNumber: b.vatNumber ?? '',
          address: b.address ?? '',
          city: b.city ?? '',
          postalCode: b.postalCode ?? '',
          country: b.country ?? 'FR',
          phone: b.phone ?? '',
          website: b.website ?? '',
          iban: b.iban ?? '',
          bic: b.bic ?? '',
          revenueGoal: b.revenueGoal ?? undefined,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  function set(key: keyof BusinessPayload) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      await apiUpdateBusiness(token, {
        ...form,
        revenueGoal: form.revenueGoal ? Number(form.revenueGoal) : null,
      });
      setAlert({ type: 'success', msg: 'Informations entreprise enregistrées.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-zinc-400"><span className="h-4 w-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"/>Chargement…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Identité */}
      <div className="space-y-4">
        <SectionTitle>Identité de l'entreprise</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nom de l'entreprise *">
              <Input value={form.name ?? ''} onChange={set('name')} required placeholder="Mon Entreprise" />
            </Field>
          </div>
          <Field label="Forme juridique">
            <Select value={form.type ?? 'AUTO_ENTREPRENEUR'} onChange={set('type')}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Objectif CA annuel (€)">
            <Input
              type="number"
              value={form.revenueGoal ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, revenueGoal: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="77700"
              min={0}
              step={100}
            />
          </Field>
          <Field label="SIRET" hint="14 chiffres">
            <Input value={form.siret ?? ''} onChange={set('siret')} placeholder="12345678900001" maxLength={14} />
          </Field>
          <Field label="SIREN" hint="9 chiffres">
            <Input value={form.siren ?? ''} onChange={set('siren')} placeholder="123456789" maxLength={9} />
          </Field>
          <Field label="N° TVA intracommunautaire">
            <Input value={form.vatNumber ?? ''} onChange={set('vatNumber')} placeholder="FR12345678901" />
          </Field>
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Coordonnées */}
      <div className="space-y-4">
        <SectionTitle>Coordonnées</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Adresse">
              <Input value={form.address ?? ''} onChange={set('address')} placeholder="12 rue de la Paix" />
            </Field>
          </div>
          <Field label="Ville">
            <Input value={form.city ?? ''} onChange={set('city')} placeholder="Paris" />
          </Field>
          <Field label="Code postal">
            <Input value={form.postalCode ?? ''} onChange={set('postalCode')} placeholder="75001" maxLength={10} />
          </Field>
          <Field label="Pays">
            <Select value={form.country ?? 'FR'} onChange={set('country')}>
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="LU">Luxembourg</option>
              <option value="CA">Canada</option>
              <option value="OTHER">Autre</option>
            </Select>
          </Field>
          <Field label="Téléphone">
            <Input value={form.phone ?? ''} onChange={set('phone')} placeholder="+33 6 00 00 00 00" type="tel" />
          </Field>
          <Field label="Site web">
            <Input value={form.website ?? ''} onChange={set('website')} placeholder="https://monsite.fr" type="url" />
          </Field>
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Bancaires */}
      <div className="space-y-4">
        <SectionTitle>Informations bancaires</SectionTitle>
        <p className="text-xs text-zinc-400 -mt-2">Affichées sur vos factures pour faciliter les paiements.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="IBAN" hint="Exemple : FR76 3000 6000 0112 3456 7890 189">
              <Input
                value={form.iban ?? ''}
                onChange={set('iban')}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="BIC / SWIFT">
            <Input value={form.bic ?? ''} onChange={set('bic')} placeholder="BNPAFRPPXXX" className="font-mono" />
          </Field>
        </div>
      </div>

      <div className="pt-2">
        <SaveButton loading={saving} />
      </div>
    </form>
  );
}

// ─── Subscription tab ─────────────────────────────────────────────────────────

function SubscriptionTab({ token }: { token: string }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetProfile(token).then((p) => {
      setSub(p.subscription ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="h-4 w-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"/>
      Chargement…
    </div>
  );

  const plan = sub?.plan ?? 'FREE';
  const meta = PLAN_META[plan] ?? PLAN_META.FREE;

  const UPGRADE_PLANS = (['STARTER', 'PRO', 'BUSINESS'] as const).filter((p) => p !== plan);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Current plan */}
      <div>
        <SectionTitle>Plan actuel</SectionTitle>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${meta.color}`}>
                {meta.label}
              </span>
              {sub?.status === 'TRIALING' && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  Période d'essai
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {meta.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                  <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            {sub?.currentPeriodEnd && (
              <p className="mt-3 text-xs text-zinc-400">
                Renouvellement le {new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}
                {sub.cancelAtPeriodEnd && ' · Annulation prévue'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade */}
      {UPGRADE_PLANS.length > 0 && (
        <div>
          <SectionTitle>Mettre à niveau</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {UPGRADE_PLANS.map((p) => {
              const m = PLAN_META[p];
              return (
                <div key={p} className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3">
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold border ${m.color}`}>
                    {m.label}
                  </span>
                  <ul className="space-y-1 flex-1">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-500">
                        <svg className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled
                    className="w-full rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-400 cursor-not-allowed"
                  >
                    Bientôt disponible
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('profile');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!t) { router.push('/login'); return; }
    setToken(t);
  }, [router]);

  if (!token) return null;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[16px] font-medium" style={{ color: '#1a1a18' }}>Paramètres</h1>
        <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>Gérez votre profil et les informations de votre entreprise</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-md p-0.5 w-fit" style={{ background: '#EDEDEB' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={tab === t.id
              ? { background: '#FFFFFF', color: '#1a1a18' }
              : { color: '#888780' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
        {tab === 'profile'      && <ProfileTab token={token} />}
        {tab === 'business'     && <BusinessTab token={token} />}
        {tab === 'subscription' && <SubscriptionTab token={token} />}
      </div>
    </div>
  );
}
