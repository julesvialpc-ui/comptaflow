'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGetClient, apiToggleActive, apiDeleteClient, ClientDetail } from '@/lib/clients';
import { eur } from '@/lib/format';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/format';

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const colors = [
    'bg-indigo-100 text-[#185FA5]', 'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  ];
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${colors[name.charCodeAt(0) % colors.length]}`}>
      {initials}
    </div>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    apiGetClient(t, id)
      .then(setClient)
      .catch(() => router.push('/clients'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleToggle() {
    if (!client) return;
    setActing(true);
    try {
      const updated = await apiToggleActive(token(), client.id);
      setClient((prev) => prev ? { ...prev, isActive: updated.isActive } : prev);
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Supprimer « ${client.name} » ? Ses factures ne seront pas supprimées.`)) return;
    setActing(true);
    try {
      await apiDeleteClient(token(), client.id);
      router.push('/clients');
    } catch {
      alert('Impossible de supprimer ce client.');
      setActing(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400">Chargement…</div>;
  }
  if (!client) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <header className="border-b border-[#E5E4E0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/clients" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900">{client.name}</h1>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  client.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {client.isActive ? 'Actif' : 'Archivé'}
                </span>
              </div>
              <p className="text-sm text-zinc-500">{client._count.invoices} facture{client._count.invoices !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/clients/${client.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </Link>
            <button
              onClick={handleToggle}
              disabled={acting}
              className="rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-60"
            >
              {client.isActive ? 'Archiver' : 'Réactiver'}
            </button>
            <Link
              href={`/invoices/new?clientId=${client.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-[#378ADD] px-3 py-2 text-sm font-semibold text-white hover:opacity-80 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle facture
            </Link>
            <button
              onClick={handleDelete}
              disabled={acting}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-60"
            >
              Supprimer
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left — info card + invoices */}
        <div className="col-span-2 space-y-6">

          {/* Identity card */}
          <div className="rounded-xl border border-[#E5E4E0] bg-white p-6">
            <div className="flex items-start gap-4 mb-6">
              <Avatar name={client.name} />
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{client.name}</h2>
                {client.siret && <p className="text-sm text-zinc-400 font-mono mt-0.5">SIRET {client.siret}</p>}
                {client.vatNumber && <p className="text-sm text-zinc-400 font-mono">TVA {client.vatNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {client.email && (
                <InfoRow label="E-mail">
                  <a href={`mailto:${client.email}`} className="text-[#378ADD] hover:underline">{client.email}</a>
                </InfoRow>
              )}
              {client.phone && <InfoRow label="Téléphone">{client.phone}</InfoRow>}
              {client.address && (
                <InfoRow label="Adresse" span>
                  {[client.address, [client.postalCode, client.city].filter(Boolean).join(' '), client.country !== 'FR' ? client.country : null]
                    .filter(Boolean).join(', ')}
                </InfoRow>
              )}
              {client.notes && (
                <InfoRow label="Notes" span>
                  <span className="text-zinc-400 italic">{client.notes}</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">Dernières factures</h2>
              <Link href={`/invoices?clientId=${client.id}`} className="text-xs text-[#378ADD] hover:underline">
                Voir toutes
              </Link>
            </div>
            {client.invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-sm text-zinc-400">Aucune facture pour ce client</p>
                <Link href={`/invoices/new?clientId=${client.id}`} className="text-sm font-medium text-[#378ADD] hover:underline">
                  Créer une facture
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="py-2.5 pl-5 pr-3 text-left font-medium text-zinc-500">N°</th>
                    <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Émise le</th>
                    <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Échéance</th>
                    <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Montant</th>
                    <th className="py-2.5 pl-3 pr-5 text-center font-medium text-zinc-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {client.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50 transition">
                      <td className="py-2.5 pl-5 pr-3">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-medium text-[#378ADD] hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">{fmtDate(inv.issueDate)}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-zinc-900">{eur(inv.total)}</td>
                      <td className="py-2.5 pl-3 pr-5 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right — stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700">Statistiques</h2>
            <StatTile label="CA encaissé" value={eur(client.totalRevenue)} accent />
            <StatTile label="Factures" value={String(client._count.invoices)} />
            {client.email && (
              <div className="pt-2 border-t border-zinc-100">
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer un e-mail
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-zinc-400 mb-0.5">{label}</p>
      <p className="text-zinc-700">{children}</p>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-[#378ADD]' : 'text-zinc-900'}`}>{value}</span>
    </div>
  );
}
