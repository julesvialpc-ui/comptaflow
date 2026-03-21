'use client';

import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Paiement annulé</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Vous avez annulé le processus de paiement. Votre abonnement actuel reste inchangé.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/settings?tab=subscription"
            className="rounded-lg bg-[#378ADD] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition"
          >
            Voir les offres
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
