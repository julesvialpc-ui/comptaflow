'use client';

import { InvoiceRow } from '@/lib/types';
import { eur, STATUS_LABEL, STATUS_COLOR } from '@/lib/format';

interface InvoiceTableProps {
  invoices: InvoiceRow[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-700">Dernières factures</h2>
      </div>
      {invoices.length === 0 ? (
        <p className="px-5 py-6 text-sm text-zinc-400">Aucune facture pour le moment.</p>
      ) : (
        <div className="divide-y divide-zinc-50">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {inv.number} · {inv.client}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(inv.issueDate).toLocaleDateString('fr-FR')}
                  {inv.dueDate && ` · échéance ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-zinc-800">{eur(inv.amount)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                  {STATUS_LABEL[inv.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
