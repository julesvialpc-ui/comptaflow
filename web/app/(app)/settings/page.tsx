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
import {
  apiGetUserCategories,
  apiCreateUserCategory,
  apiDeleteUserCategory,
} from '@/lib/user-categories';
import { Business, BusinessType, Subscription, UserCategory, CategoryBudget, ExpenseCategory } from '@/lib/types';
import {
  apiGetCategoryBudgets,
  apiUpsertCategoryBudget,
  apiDeleteCategoryBudget,
} from '@/lib/category-budgets';
import { eur } from '@/lib/format';
import { apiCreateCheckout, apiCreatePortal } from '@/lib/subscriptions';

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

const PLAN_META: Record<string, { label: string; price: string; color: string; features: string[] }> = {
  FREE: {
    label: 'Gratuit',
    price: '0 €/mois',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    features: ['5 factures / mois', '10 clients', 'Dashboard basique', 'Export PDF'],
  },
  PRO: {
    label: 'Pro',
    price: '9 €/mois',
    color: 'bg-[#E6F1FB] text-[#378ADD] border-[#378ADD]',
    features: ['Factures illimitées', 'Assistant IA complet', 'Multi-utilisateurs (2)', 'Support prioritaire'],
  },
  BUSINESS: {
    label: 'Business',
    price: '19 €/mois',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    features: ['Tout Pro +', 'Multi-utilisateurs illimité', 'API access', 'Gestionnaire dédié'],
  },
};

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',      label: 'Profil' },
  { id: 'business',     label: 'Entreprise' },
  { id: 'categories',   label: 'Catégories' },
  { id: 'budgets',      label: 'Budgets' },
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
  const [isVatSubject, setIsVatSubject] = useState(false);
  const [defaultVatRate, setDefaultVatRate] = useState('0.20');
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
        setIsVatSubject(b.isVatSubject ?? false);
        setDefaultVatRate(String(b.defaultVatRate ?? 0.20));
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
        isVatSubject,
        defaultVatRate: parseFloat(defaultVatRate),
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
          <div className="sm:col-span-2">
            {/* TVA */}
            <div className="pt-4 border-t border-[#E5E4E0]">
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#888780' }}>TVA</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setIsVatSubject(!isVatSubject)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${isVatSubject ? 'bg-[#378ADD]' : 'bg-zinc-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isVatSubject ? 'translate-x-4' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Assujetti à la TVA</p>
                    <p className="text-[11px]" style={{ color: '#888780' }}>Activez si vous êtes redevable de la TVA</p>
                  </div>
                </label>
                {isVatSubject && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px]" style={{ color: '#888780' }}>Taux TVA par défaut</label>
                    <select
                      value={defaultVatRate}
                      onChange={(e) => setDefaultVatRate(e.target.value)}
                      className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                      style={{ border: '0.5px solid #E5E4E0', background: '#F8F8F7', color: '#1a1a18' }}
                    >
                      <option value="0">0 % (exonéré)</option>
                      <option value="0.055">5,5 %</option>
                      <option value="0.10">10 %</option>
                      <option value="0.20">20 % (taux normal)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
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
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiGetProfile(token).then((p) => {
      setSub(p.subscription ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function handleCheckout(plan: 'PRO' | 'BUSINESS') {
    setCheckoutLoading(plan);
    setAlert(null);
    try {
      const { url } = await apiCreateCheckout(token, plan);
      window.location.href = url;
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors de la redirection vers le paiement.' });
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setAlert(null);
    try {
      const { url } = await apiCreatePortal(token);
      window.location.href = url;
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors de la redirection vers le portail.' });
      setPortalLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="h-4 w-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"/>
      Chargement…
    </div>
  );

  const plan = sub?.plan ?? 'FREE';
  const meta = PLAN_META[plan] ?? PLAN_META.FREE;
  const isPaid = plan === 'PRO' || plan === 'BUSINESS';
  const UPGRADE_PLANS = (['PRO', 'BUSINESS'] as const).filter((p) => p !== plan);

  return (
    <div className="max-w-2xl space-y-6">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Current plan */}
      <div>
        <SectionTitle>Plan actuel</SectionTitle>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-xs text-zinc-400">{meta.price}</span>
              {sub?.status === 'TRIALING' && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  Période d&apos;essai
                </span>
              )}
              {sub?.status === 'PAST_DUE' && (
                <span className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                  Paiement en retard
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
                {sub.cancelAtPeriodEnd
                  ? `Annulation prévue le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}`
                  : `Renouvellement le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}`}
              </p>
            )}
          </div>
          {isPaid && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition"
            >
              {portalLoading && <span className="h-3 w-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />}
              Gérer l&apos;abonnement
            </button>
          )}
        </div>
      </div>

      {/* Upgrade */}
      {UPGRADE_PLANS.length > 0 && (
        <div>
          <SectionTitle>Mettre à niveau</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {UPGRADE_PLANS.map((p) => {
              const m = PLAN_META[p];
              const isLoading = checkoutLoading === p;
              return (
                <div key={p} className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold border ${m.color}`}>
                      {m.label}
                    </span>
                    <span className="text-sm font-semibold text-zinc-700">{m.price}</span>
                  </div>
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
                    onClick={() => handleCheckout(p)}
                    disabled={!!checkoutLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#378ADD] py-2 text-xs font-semibold text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isLoading && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Passer au plan {m.label}
                  </button>
                  <p className="text-center text-[10px] text-zinc-400">Sans engagement · Annulez à tout moment</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categories tab ───────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#378ADD', '#185FA5', '#9FE1CB', '#3B6D11', '#FAC775',
  '#F4C0D1', '#D3D1C7', '#B5D4F4', '#EAF3DE', '#F87171',
  '#34D399', '#FBBF24',
];

function CategorySection({
  token,
  type,
  title,
}: {
  token: string;
  type: 'EXPENSE' | 'REVENUE';
  title: string;
}) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#378ADD');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiGetUserCategories(token, type)
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, type]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setAlert(null);
    try {
      const created = await apiCreateUserCategory(token, { name: newName.trim(), color: newColor, type });
      setCategories((prev) => [...prev, created]);
      setNewName('');
      setAlert({ type: 'success', msg: 'Catégorie créée.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await apiDeleteUserCategory(token, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors de la suppression.' });
    }
  }

  const inputCls = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="h-4 w-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
          Chargement…
        </div>
      ) : (
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="text-sm text-zinc-400">Aucune catégorie personnalisée.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-4 w-4 rounded-full flex-shrink-0 border border-zinc-200" style={{ background: cat.color }} />
                <span className="text-sm font-medium text-zinc-800">{cat.name}</span>
              </div>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition"
                title="Supprimer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Nouvelle catégorie</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la catégorie…"
            className={`flex-1 ${inputCls}`}
            required
          />
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs text-zinc-400 mb-2">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  newColor === c ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-400">ou</span>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-zinc-200"
              />
            </div>
          </div>
          {newColor && (
            <div className="flex items-center gap-2 mt-2">
              <span className="h-4 w-4 rounded-full border border-zinc-200" style={{ background: newColor }} />
              <span className="text-xs text-zinc-500">{newColor}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Créer
        </button>
      </form>
    </div>
  );
}

function CategoriesTab({ token }: { token: string }) {
  const [subtab, setSubtab] = useState<'EXPENSE' | 'REVENUE'>('EXPENSE');

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <SectionTitle>Catégories personnalisées</SectionTitle>
        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Créez vos propres catégories avec des couleurs pour personnaliser vos dépenses et revenus.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-md p-0.5 w-fit" style={{ background: '#EDEDEB' }}>
        {([['EXPENSE', 'Dépenses'], ['REVENUE', 'Revenus']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubtab(id)}
            className="rounded px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={subtab === id ? { background: '#FFFFFF', color: '#1a1a18' } : { color: '#888780' }}
          >
            {label}
          </button>
        ))}
      </div>

      {subtab === 'EXPENSE' && (
        <CategorySection token={token} type="EXPENSE" title="Catégories de dépenses" />
      )}
      {subtab === 'REVENUE' && (
        <CategorySection token={token} type="REVENUE" title="Catégories de revenus" />
      )}
    </div>
  );
}

// ─── Budgets tab ─────────────────────────────────────────────────────────────

const BUDGET_CAT_LABELS: Record<string, string> = {
  OFFICE_SUPPLIES: 'Fournitures',
  TRAVEL: 'Déplacements',
  MEALS: 'Repas',
  EQUIPMENT: 'Matériel',
  SOFTWARE: 'Logiciels',
  MARKETING: 'Marketing',
  PROFESSIONAL_FEES: 'Honoraires',
  RENT: 'Loyer',
  UTILITIES: 'Charges',
  INSURANCE: 'Assurance',
  TAXES: 'Impôts',
  SALARY: 'Salaires',
  OTHER: 'Autre',
};

const BUDGET_CATEGORIES = Object.keys(BUDGET_CAT_LABELS) as ExpenseCategory[];

function BudgetsTab({ token }: { token: string }) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('OTHER');
  const [newAmount, setNewAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiGetCategoryBudgets(token)
      .then(setBudgets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) { setAlert({ type: 'error', msg: 'Montant invalide.' }); return; }
    setSaving(true);
    setAlert(null);
    try {
      const created = await apiUpsertCategoryBudget(token, { category: newCategory, amount: amt, period: 'MONTHLY' });
      setBudgets(prev => {
        const exists = prev.findIndex(b => b.category === created.category);
        if (exists >= 0) {
          return prev.map((b, i) => i === exists ? created : b);
        }
        return [...prev, created];
      });
      setNewAmount('');
      setAlert({ type: 'success', msg: 'Budget enregistré.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce budget ?')) return;
    try {
      await apiDeleteCategoryBudget(token, id);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      setAlert({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    }
  }

  function barColor(pct: number) {
    if (pct > 90) return '#DC2626';
    if (pct > 70) return '#F59E0B';
    return '#3B6D11';
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="h-4 w-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"/>Chargement…
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <SectionTitle>Budgets par catégorie</SectionTitle>
        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Les budgets sont calculés sur le mois en cours.
        </p>
      </div>

      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Budget list */}
      <div className="space-y-3">
        {budgets.length === 0 && (
          <p className="text-sm text-zinc-400">Aucun budget défini.</p>
        )}
        {budgets.map(b => {
          const pct = b.percentage ?? 0;
          return (
            <div key={b.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-zinc-800">{BUDGET_CAT_LABELS[b.category] ?? b.category}</span>
                  <span className="text-xs text-zinc-400 ml-2">{eur(b.currentSpend ?? 0)} / {eur(b.amount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums" style={{ color: barColor(pct) }}>
                    {Math.round(pct)}%
                  </span>
                  <button onClick={() => handleDelete(b.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition" title="Supprimer">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-zinc-200">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%`, background: barColor(pct) }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add budget form */}
      <form onSubmit={handleCreate} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Ajouter un budget</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Catégorie</label>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent">
              {BUDGET_CATEGORIES.map(c => (
                <option key={c} value={c}>{BUDGET_CAT_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Budget mensuel (€)</label>
            <input type="number" min="0" step="10" value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="500"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent" />
          </div>
        </div>
        <button type="submit" disabled={saving || !newAmount}
          className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition">
          {saving && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Enregistrer
        </button>
      </form>
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
        {tab === 'categories'   && <CategoriesTab token={token} />}
        {tab === 'budgets'      && <BudgetsTab token={token} />}
        {tab === 'subscription' && <SubscriptionTab token={token} />}
      </div>
    </div>
  );
}
