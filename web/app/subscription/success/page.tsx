'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push('/dashboard'), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Abonnement activé !</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Votre paiement a bien été traité. Votre nouveau plan est maintenant actif.
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
          Vous allez être redirigé vers votre tableau de bord dans quelques secondes…
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#378ADD] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition"
          >
            Aller au tableau de bord
          </Link>
          <Link
            href="/settings?tab=subscription"
            className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            Voir mon abonnement
          </Link>
        </div>
      </div>
    </div>
  );
}
