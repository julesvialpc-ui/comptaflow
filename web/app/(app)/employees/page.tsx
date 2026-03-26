'use client';

import { useEffect, useState } from 'react';
import { Employee, ContractType } from '@/lib/types';
import { eur } from '@/lib/format';
import {
  apiGetEmployees,
  apiGetEmployeeStats,
  apiCreateEmployee,
  apiUpdateEmployee,
  apiDeleteEmployee,
  EmployeePayload,
} from '@/lib/employees';

const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI:        'CDI',
  CDD:        'CDD',
  FREELANCE:  'Freelance',
  ALTERNANCE: 'Alternance',
  STAGE:      'Stage',
  OTHER:      'Autre',
};

const CONTRACT_COLORS: Record<ContractType, { bg: string; text: string }> = {
  CDI:        { bg: '#F0F9EC', text: '#3B6D11' },
  CDD:        { bg: '#FFFBEB', text: '#B45309' },
  FREELANCE:  { bg: '#E6F1FB', text: '#185FA5' },
  ALTERNANCE: { bg: '#F5F0FB', text: '#6B21A8' },
  STAGE:      { bg: '#FFF0F0', text: '#A32D2D' },
  OTHER:      { bg: '#F5F5F3', text: '#6B6868' },
};

const EMPTY_FORM: EmployeePayload = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  position: '',
  contractType: 'CDI',
  grossSalary: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  socialSecurityNumber: '',
  iban: '',
  notes: '',
};

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; totalGrossSalary: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function token() {
    return localStorage.getItem('accessToken') ?? '';
  }

  async function load(q?: string) {
    setLoading(true);
    try {
      const [emps, st] = await Promise.all([
        apiGetEmployees(token(), q),
        apiGetEmployeeStats(token()),
      ]);
      setEmployees(emps);
      setStats(st);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(id);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      address: emp.address ?? '',
      city: emp.city ?? '',
      postalCode: emp.postalCode ?? '',
      position: emp.position ?? '',
      contractType: emp.contractType,
      grossSalary: emp.grossSalary,
      startDate: emp.startDate.slice(0, 10),
      endDate: emp.endDate ? emp.endDate.slice(0, 10) : '',
      socialSecurityNumber: emp.socialSecurityNumber ?? '',
      iban: emp.iban ?? '',
      isActive: emp.isActive,
      notes: emp.notes ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!form.grossSalary || form.grossSalary <= 0) {
      setError('Le salaire brut doit être supérieur à 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        endDate: form.endDate || null,
      };
      if (editing) {
        await apiUpdateEmployee(token(), editing.id, payload);
      } else {
        await apiCreateEmployee(token(), payload);
      }
      setShowForm(false);
      load(search || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(emp: Employee) {
    try {
      await apiUpdateEmployee(token(), emp.id, { isActive: !emp.isActive });
      load(search || undefined);
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await apiDeleteEmployee(token(), deleteId);
      setDeleteId(null);
      load(search || undefined);
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold" style={{ color: '#1a1a18' }}>Mes employés</h1>
          {stats && (
            <p className="text-[13px] mt-0.5" style={{ color: '#888780' }}>
              {stats.active} actif{stats.active !== 1 ? 's' : ''} · masse salariale brute {eur(stats.totalGrossSalary)}/mois
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white"
          style={{ background: '#185FA5' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Ajouter
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="#888780" strokeWidth="1.2" />
          <path d="M11 11l3 3" stroke="#888780" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, prénom, poste…"
          className="w-full rounded-lg pl-9 pr-4 py-2 text-[13px] outline-none"
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1a1a18' }}>Aucun employé</p>
          <p className="text-[13px]" style={{ color: '#888780' }}>
            {search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier employé en cliquant sur "Ajouter".'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => {
            const colors = CONTRACT_COLORS[emp.contractType];
            return (
              <div
                key={emp.id}
                className="rounded-lg px-4 py-3 flex items-center gap-4"
                style={{
                  background: '#FFFFFF',
                  border: '0.5px solid #E5E4E0',
                  opacity: emp.isActive ? 1 : 0.6,
                }}
              >
                {/* Avatar */}
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                  style={{ background: emp.isActive ? '#378ADD' : '#BCBAB6' }}
                >
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium truncate" style={{ color: '#1a1a18' }}>
                      {emp.firstName} {emp.lastName}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {CONTRACT_LABELS[emp.contractType]}
                    </span>
                    {!emp.isActive && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#F5F5F3', color: '#888780' }}
                      >
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] truncate" style={{ color: '#888780' }}>
                    {emp.position || '—'} {emp.email ? `· ${emp.email}` : ''}
                  </p>
                </div>

                {/* Salary + dates */}
                <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                  <p className="text-[14px] font-semibold tabular-nums" style={{ color: '#1a1a18' }}>{eur(emp.grossSalary)}<span className="text-[11px] font-normal" style={{ color: '#888780' }}>/mois</span></p>
                  <p className="text-[11px]" style={{ color: '#888780' }}>depuis le {fmt(emp.startDate)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(emp)}
                    className="rounded-md p-1.5 transition-colors"
                    style={{ color: '#888780' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    title="Modifier"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className="rounded-md p-1.5 transition-colors"
                    style={{ color: '#888780' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F3'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    title={emp.isActive ? 'Désactiver' : 'Réactiver'}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      {emp.isActive ? (
                        <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M13 8H3m5-5L3 8l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(emp.id)}
                    className="rounded-md p-1.5 transition-colors"
                    style={{ color: '#DC2626' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    title="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6 mx-4"
            style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold" style={{ color: '#1a1a18' }}>
                {editing ? 'Modifier l\'employé' : 'Ajouter un employé'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md p-1.5"
                style={{ color: '#888780' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Prénom *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Nom *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              {/* Email & Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="jean.dupont@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              {/* Poste & Contrat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Poste</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="Développeur, Commercial…"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Type de contrat</label>
                  <select
                    value={form.contractType}
                    onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value as ContractType }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  >
                    {(Object.keys(CONTRACT_LABELS) as ContractType[]).map((k) => (
                      <option key={k} value={k}>{CONTRACT_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salaire brut */}
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Salaire brut mensuel (€) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.grossSalary || ''}
                  onChange={(e) => setForm((p) => ({ ...p, grossSalary: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  placeholder="2500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Date d'entrée *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Date de fin</label>
                  <input
                    type="date"
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value || '' }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Adresse</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="12 rue de la Paix"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Code postal</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="75001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Ville</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  placeholder="Paris"
                />
              </div>

              {/* N° SS & IBAN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>N° de sécurité sociale</label>
                  <input
                    type="text"
                    value={form.socialSecurityNumber}
                    onChange={(e) => setForm((p) => ({ ...p, socialSecurityNumber: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="1 85 05 75 123 456 78"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>IBAN</label>
                  <input
                    type="text"
                    value={form.iban}
                    onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
                  style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
                  placeholder="Informations complémentaires…"
                />
              </div>

              {editing && (
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={form.isActive !== false}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-[13px]" style={{ color: '#1a1a18' }}>Employé actif</label>
                </div>
              )}

              {error && (
                <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium"
                  style={{ background: '#F5F5F3', color: '#6B6868' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                  style={{ background: '#185FA5' }}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#14508a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#185FA5'; }}
                >
                  {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="rounded-xl p-6 mx-4 w-full max-w-sm" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#1a1a18' }}>Supprimer l'employé ?</h3>
            <p className="text-[13px] mb-5" style={{ color: '#888780' }}>Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium"
                style={{ background: '#F5F5F3', color: '#6B6868' }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-white"
                style={{ background: '#DC2626' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
