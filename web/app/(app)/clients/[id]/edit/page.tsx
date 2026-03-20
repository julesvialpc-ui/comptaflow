'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ClientForm } from '../../_components/ClientForm';
import { apiGetClient, apiUpdateClient, ClientPayload } from '@/lib/clients';
import { Client } from '@/lib/types';

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function EditClientPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    apiGetClient(t, id)
      .then(setClient)
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSubmit(payload: ClientPayload) {
    await apiUpdateClient(token(), id, payload);
    router.push(`/clients/${id}`);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400">Chargement…</div>;
  }
  if (!client) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href={`/clients/${id}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Modifier {client.name}</h1>
            <p className="text-sm text-zinc-500">Mettez à jour les informations du client</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-6">
        <ClientForm
          initial={client}
          onSubmit={handleSubmit}
          backHref={`/clients/${id}`}
          submitLabel="Enregistrer les modifications"
        />
      </main>
    </div>
  );
}
