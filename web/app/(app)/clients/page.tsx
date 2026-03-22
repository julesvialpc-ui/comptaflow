'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGetClients, apiToggleActive, apiDeleteClient, ClientWithStats } from '@/lib/clients';
import { eur } from '@/lib/format';
import { getActivePlan } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { apiGetUsage, PlanUsage } from '@/lib/subscriptions';
import UpgradeModal from '@/components/UpgradeModal';

function token() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const colors = [
    'bg-indigo-100 text-[#185FA5]',
    'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${color}`}>
      {initials}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = getActivePlan(user);
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    setLoading(true);
    apiGetClients(t, debouncedSearch || undefined)
      .then(setClients)
      .finally(() => setLoading(false));
  }, [debouncedSearch, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (plan !== 'FREE') return;
    const t = token();
    if (!t) return;
    apiGetUsage(t).then(setUsage).catch(() => {});
  }, [plan]);

  const displayed = showInactive ? clients : clients.filter((c) => c.isActive);

  async function handleToggle(id: string) {
    setActionId(id);
    try {
      const updated = await apiToggleActive(token(), id);
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: updated.isActive } : c)));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le client « ${name} » ? Ses factures ne seront pas supprimées.`)) return;
    setActionId(id);
    try {
      await apiDeleteClient(token(), id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Impossible de supprimer ce client (vérifiez qu\'il n\'a pas de factures liées).');
    } finally {
      setActionId(null);
    }
  }

  const active = clients.filter((c) => c.isActive).length;
  const inactive = clients.filter((c) => !c.isActive).length;
  const atClientLimit = plan === 'FREE' && usage?.limits && usage.usage.clientsTotal >= usage.limits.clientsTotal;

  return (
    <div className="p-6 space-y-4">
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Limite de clients atteinte"
        description={`Vous avez atteint la limite de ${usage?.limits?.clientsTotal ?? 10} clients. Passez au plan Pro pour des clients illimités.`}
      />
      {/* Header */}
      <header className="border-b border-[#E5E4E0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Clients</h1>
            <p className="text-sm text-zinc-500">
              {active} actif{active !== 1 ? 's' : ''}
              {inactive > 0 && ` · ${inactive} archivé${inactive !== 1 ? 's' : ''}`}
              {plan === 'FREE' && usage?.limits && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: atClientLimit ? '#FEE2E2' : '#F5F5F3', color: atClientLimit ? '#DC2626' : '#888780' }}
                >
                  {usage.usage.clientsTotal}/{usage.limits.clientsTotal} clients
                </span>
              )}
            </p>
          </div>
          {atClientLimit ? (
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: '#185FA5' }}
            >
              ✦ Passer au Pro
            </button>
          ) : (
            <Link
              href="/clients/new"
              className="flex items-center gap-2 rounded-lg bg-[#378ADD] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau client
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Nom, email, ville, SIRET…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E5E4E0] bg-white py-2 pl-9 pr-3 text-sm placeholder-zinc-400 focus:border-[#378ADD] focus:outline-none focus:ring-2 focus:ring-[#E6F1FB]"
            />
          </div>
          {inactive > 0 && (
            <button
              onClick={() => setShowInactive((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                showInactive
                  ? 'border-[#E6F1FB] bg-[#E6F1FB] text-[#185FA5]'
                  : 'border-[#E5E4E0] bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
              </svg>
              Afficher les archivés
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-zinc-400">Chargement…</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-24 gap-3">
            <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-zinc-400">
              {search ? 'Aucun client ne correspond à la recherche' : 'Aucun client pour l\'instant'}
            </p>
            {!search && (
              <Link href="/clients/new" className="text-sm font-medium text-[#378ADD] hover:underline">
                Ajouter un client
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E4E0] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="py-3 pl-5 pr-3 text-left font-medium text-zinc-500">Client</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Contact</th>
                  <th className="px-3 py-3 text-left font-medium text-zinc-500">Ville</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-500">Factures</th>
                  <th className="px-3 py-3 text-center font-medium text-zinc-500">Statut</th>
                  <th className="py-3 pl-3 pr-5 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayed.map((client) => (
                  <tr key={client.id} className={`group transition hover:bg-zinc-50 ${!client.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} />
                        <div>
                          <p className="font-medium text-zinc-900">{client.name}</p>
                          {client.siret && (
                            <p className="text-xs text-zinc-400 font-mono">SIRET {client.siret}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-500">
                      <div className="space-y-0.5">
                        {client.email && <p className="truncate max-w-[180px]">{client.email}</p>}
                        {client.phone && <p className="text-xs text-zinc-400">{client.phone}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-500">
                      {[client.city, client.postalCode].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                        {client._count.invoices}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        client.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {client.isActive ? 'Actif' : 'Archivé'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        {/* View */}
                        <Link
                          href={`/clients/${client.id}`}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                          title="Voir le détail"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {/* Edit */}
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
                          title="Modifier"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        {/* Archive / Unarchive */}
                        <button
                          onClick={() => handleToggle(client.id)}
                          disabled={actionId === client.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition disabled:opacity-40"
                          title={client.isActive ? 'Archiver' : 'Réactiver'}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {client.isActive ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            )}
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          disabled={actionId === client.id}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                          title="Supprimer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
