'use client';

import { InvoiceRow } from '@/lib/types';
import { eur, STATUS_LABEL, STATUS_COLOR } from '@/lib/format';

interface InvoiceTableProps {
  invoices: InvoiceRow[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  return (
    <div className="rounded-lg" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
      <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid #E5E4E0' }}>
        <h2 className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Dernières factures</h2>
      </div>
      {invoices.length === 0 ? (
        <p className="px-4 py-5 text-[13px]" style={{ color: '#888780' }}>Aucune facture pour le moment.</p>
      ) : (
        <div>
          {invoices.map((inv, i) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < invoices.length - 1 ? '0.5px solid #F0F0EE' : undefined }}>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: '#1a1a18' }}>
                  {inv.number} · {inv.client}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>
                  {new Date(inv.issueDate).toLocaleDateString('fr-FR')}
                  {inv.dueDate && ` · échéance ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2.5 shrink-0">
                <span className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>{eur(inv.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inv.status]}`}>
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
