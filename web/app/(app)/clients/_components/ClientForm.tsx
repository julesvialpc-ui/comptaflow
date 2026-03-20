'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Client } from '@/lib/types';
import { ClientPayload } from '@/lib/clients';

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  id,
  required,
  ...props
}: { label: string; id: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        {...props}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientFormProps {
  initial?: Partial<Client>;
  onSubmit: (payload: ClientPayload) => Promise<void>;
  backHref: string;
  submitLabel: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientForm({ initial, onSubmit, backHref, submitLabel }: ClientFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [country, setCountry] = useState(initial?.country ?? 'FR');
  const [siret, setSiret] = useState(initial?.siret ?? '');
  const [vatNumber, setVatNumber] = useState(initial?.vatNumber ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Le nom du client est requis.'); return; }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || 'FR',
        siret: siret.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      } as ClientPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Identité */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Identité</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field id="name" label="Nom / Raison sociale" required
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Marie Dupont Conseil" />
          </div>
          <Field id="siret" label="SIRET"
            value={siret} onChange={(e) => setSiret(e.target.value)}
            placeholder="12345678901234" maxLength={14} />
          <Field id="vatNumber" label="N° TVA intracommunautaire"
            value={vatNumber} onChange={(e) => setVatNumber(e.target.value)}
            placeholder="FR12345678901" />
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field id="email" label="E-mail" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@exemple.fr" />
          <Field id="phone" label="Téléphone"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 1 23 45 67 89" />
        </div>
      </section>

      {/* Adresse */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700">Adresse</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field id="address" label="Adresse"
              value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue de la Paix" />
          </div>
          <Field id="postalCode" label="Code postal"
            value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
            placeholder="75001" />
          <Field id="city" label="Ville"
            value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Paris" />
          <div className="space-y-1">
            <label htmlFor="country" className="block text-xs font-medium text-zinc-500">Pays</label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="LU">Luxembourg</option>
              <option value="DE">Allemagne</option>
              <option value="ES">Espagne</option>
              <option value="IT">Italie</option>
              <option value="GB">Royaume-Uni</option>
              <option value="US">États-Unis</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-1">
        <label htmlFor="notes" className="block text-xs font-medium text-zinc-500">Notes internes</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informations complémentaires sur ce client…"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Enregistrement…' : submitLabel}
        </button>
        <Link href={backHref} className="text-sm text-zinc-400 hover:text-zinc-600 transition">
          Annuler
        </Link>
      </div>
    </form>
  );
}
