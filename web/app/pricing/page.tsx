import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tarifs — Konta',
  description: 'Plans Konta : gratuit, Pro 9€/mois, Business 19€/mois. Sans engagement.',
};

const PLANS = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: 0,
    description: 'Pour démarrer et tester',
    color: '#1a1a18',
    bg: '#F5F5F3',
    border: '#E5E4E0',
    cta: 'Commencer gratuitement',
    ctaHref: '/register',
    ctaStyle: { background: '#F5F5F3', color: '#1a1a18', border: '1px solid #E5E4E0' },
    features: [
      '5 factures / mois',
      '10 clients',
      '5 devis / mois',
      'Dashboard basique',
      'Export PDF',
      'Support communauté',
    ],
    notIncluded: [
      'Factures illimitées',
      'Suivi du temps',
      'Budgets & prévisions',
      'Assistant IA',
      'Notifications automatiques',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 9,
    description: 'Pour les indépendants actifs',
    color: '#185FA5',
    bg: '#E6F1FB',
    border: '#378ADD',
    badge: 'Populaire',
    cta: 'Choisir Pro',
    ctaHref: '/register?plan=PRO',
    ctaStyle: { background: '#378ADD', color: '#FFFFFF' },
    features: [
      'Factures illimitées',
      'Clients illimités',
      'Devis illimités',
      'Suivi du temps',
      'Budgets & prévisions',
      'Notifications automatiques',
      'URSSAF & IR estimés',
      'Dashboard avancé N vs N-1',
      'Support prioritaire',
    ],
    notIncluded: [
      'Multi-utilisateurs',
      'API access',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 19,
    description: 'Pour les équipes et agences',
    color: '#5B21B6',
    bg: '#F5F3FF',
    border: '#7C3AED',
    cta: 'Choisir Business',
    ctaHref: '/register?plan=BUSINESS',
    ctaStyle: { background: '#7C3AED', color: '#FFFFFF' },
    features: [
      'Tout Pro inclus',
      'Multi-utilisateurs (à venir)',
      'API access (à venir)',
      'Export comptable (FEC)',
      'Gestionnaire de compte dédié',
      'SLA 99.9%',
    ],
    notIncluded: [],
  },
];

const COMPARISON = [
  { label: 'Factures / mois', FREE: '5', PRO: 'Illimité', BUSINESS: 'Illimité' },
  { label: 'Clients', FREE: '10', PRO: 'Illimité', BUSINESS: 'Illimité' },
  { label: 'Devis', FREE: '5 / mois', PRO: 'Illimité', BUSINESS: 'Illimité' },
  { label: 'Export PDF', FREE: true, PRO: true, BUSINESS: true },
  { label: 'Suivi du temps', FREE: false, PRO: true, BUSINESS: true },
  { label: 'Budgets catégories', FREE: false, PRO: true, BUSINESS: true },
  { label: 'Prévisions trésorerie', FREE: false, PRO: true, BUSINESS: true },
  { label: 'URSSAF & IR estimés', FREE: false, PRO: true, BUSINESS: true },
  { label: 'Notifications auto', FREE: false, PRO: true, BUSINESS: true },
  { label: 'Catégories personnalisées', FREE: false, PRO: true, BUSINESS: true },
  { label: 'Export FEC', FREE: false, PRO: false, BUSINESS: true },
  { label: 'API access', FREE: false, PRO: false, BUSINESS: true },
  { label: 'Support', FREE: 'Communauté', PRO: 'Prioritaire', BUSINESS: 'Dédié' },
];

function CheckIcon({ ok }: { ok: boolean }) {
  if (ok) return (
    <svg className="h-4 w-4 mx-auto" fill="none" stroke="#3B6D11" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  return (
    <svg className="h-4 w-4 mx-auto" fill="none" stroke="#D3D1C7" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') return <CheckIcon ok={value} />;
  return <span className="text-[12px]" style={{ color: '#1a1a18' }}>{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F5F5F3' }}>
      {/* Nav */}
      <nav className="border-b" style={{ background: '#FFFFFF', borderColor: '#E5E4E0' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[16px] font-semibold" style={{ color: '#1a1a18' }}>
            Konta
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px]" style={{ color: '#888780' }}>
              Se connecter
            </Link>
            <Link
              href="/register"
              className="rounded-md px-4 py-2 text-[13px] font-medium"
              style={{ background: '#378ADD', color: '#FFFFFF' }}
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-[32px] font-semibold mb-3" style={{ color: '#1a1a18' }}>
            Un plan pour chaque étape
          </h1>
          <p className="text-[16px]" style={{ color: '#888780' }}>
            Sans engagement · Résiliation en 1 clic · Paiement sécurisé par Stripe
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl p-6 flex flex-col relative"
              style={{
                background: '#FFFFFF',
                border: plan.badge ? `2px solid ${plan.border}` : '1px solid #E5E4E0',
              }}
            >
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: plan.border, color: '#FFFFFF' }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <span
                  className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold mb-3"
                  style={{ background: plan.bg, color: plan.color }}
                >
                  {plan.name}
                </span>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[36px] font-semibold" style={{ color: '#1a1a18' }}>
                    {plan.price}€
                  </span>
                  {plan.price > 0 && (
                    <span className="text-[13px]" style={{ color: '#888780' }}>/mois</span>
                  )}
                </div>
                <p className="text-[13px]" style={{ color: '#888780' }}>{plan.description}</p>
              </div>

              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: '#1a1a18' }}>
                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="#3B6D11" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: '#D3D1C7' }}>
                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="#D3D1C7" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className="block text-center rounded-lg py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-80"
                style={plan.ctaStyle}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl overflow-hidden mb-16" style={{ background: '#FFFFFF', border: '1px solid #E5E4E0' }}>
          <div className="grid grid-cols-4 p-4 border-b" style={{ borderColor: '#E5E4E0', background: '#F8F8F7' }}>
            <div />
            {['Gratuit', 'Pro', 'Business'].map((n) => (
              <div key={n} className="text-center text-[13px] font-semibold" style={{ color: '#1a1a18' }}>{n}</div>
            ))}
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-4 px-4 py-3 items-center"
              style={{ borderBottom: i < COMPARISON.length - 1 ? '1px solid #F0F0EE' : undefined }}
            >
              <div className="text-[12px]" style={{ color: '#888780' }}>{row.label}</div>
              <div className="text-center"><CellValue value={row.FREE} /></div>
              <div className="text-center"><CellValue value={row.PRO} /></div>
              <div className="text-center"><CellValue value={row.BUSINESS} /></div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[20px] font-semibold text-center mb-8" style={{ color: '#1a1a18' }}>Questions fréquentes</h2>
          {[
            {
              q: 'Puis-je changer de plan à tout moment ?',
              a: 'Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement est immédiat et le prorata est calculé automatiquement.',
            },
            {
              q: 'Y a-t-il un engagement ?',
              a: 'Non, aucun engagement. Vous pouvez annuler à tout moment depuis votre espace client. Vous conservez votre accès jusqu\'à la fin de la période facturée.',
            },
            {
              q: 'Comment fonctionne le paiement ?',
              a: 'Le paiement est sécurisé par Stripe, leader mondial des paiements en ligne. Nous acceptons toutes les cartes bancaires. Aucune donnée de carte n\'est stockée sur nos serveurs.',
            },
            {
              q: 'Mes données sont-elles protégées ?',
              a: 'Oui. Vos données sont hébergées en Europe (RGPD), sauvegardées quotidiennement et ne sont jamais partagées avec des tiers.',
            },
            {
              q: 'Est-ce que le plan gratuit est vraiment gratuit ?',
              a: 'Oui, sans limite de durée. Aucune carte bancaire n\'est requise pour commencer.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="mb-6 pb-6" style={{ borderBottom: '1px solid #E5E4E0' }}>
              <p className="text-[14px] font-medium mb-2" style={{ color: '#1a1a18' }}>{q}</p>
              <p className="text-[13px]" style={{ color: '#888780' }}>{a}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="text-center mt-12 rounded-2xl p-10" style={{ background: '#185FA5' }}>
          <h2 className="text-[22px] font-semibold text-white mb-2">Prêt à simplifier votre comptabilité ?</h2>
          <p className="text-[14px] text-white/70 mb-6">Rejoignez des centaines de micro-entrepreneurs qui gèrent leur compta avec Konta.</p>
          <Link
            href="/register"
            className="inline-block rounded-lg px-8 py-3 text-[14px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#FFFFFF', color: '#185FA5' }}
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}
