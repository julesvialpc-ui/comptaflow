'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClientForm } from '../_components/ClientForm';
import { apiCreateClient, ClientPayload } from '@/lib/clients';

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function NewClientPage() {
  const router = useRouter();

  async function handleSubmit(payload: ClientPayload) {
    const created = await apiCreateClient(token(), payload);
    router.push(`/clients/${created.id}`);
  }

  return (
    <div className="p-6">
      <header className="border-b border-[#E5E4E0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/clients" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Nouveau client</h1>
            <p className="text-sm text-zinc-500">Renseignez les informations du client</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-6">
        <ClientForm onSubmit={handleSubmit} backHref="/clients" submitLabel="Créer le client" />
      </main>
    </div>
  );
}
