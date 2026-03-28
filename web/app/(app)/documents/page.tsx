'use client';

import { useEffect, useState, useRef } from 'react';
import { Document } from '@/lib/types';
import { apiGetDocuments, apiUploadDocument, apiDeleteDocument } from '@/lib/documents';
import { eur } from '@/lib/format';

const CATEGORIES = [
  { value: 'INVOICE',     label: 'Facture fournisseur', icon: '🧾' },
  { value: 'RECEIPT',     label: 'Ticket de caisse',    icon: '🧾' },
  { value: 'CONTRACT',    label: 'Contrat',              icon: '📄' },
  { value: 'TAX',         label: 'Document fiscal',      icon: '🏛️' },
  { value: 'INSURANCE',   label: 'Assurance',            icon: '🛡️' },
  { value: 'CERTIFICATE', label: 'Certificat / Diplôme', icon: '📜' },
  { value: 'OTHER',       label: 'Autre',                icon: '📁' },
] as const;

type DocCategory = typeof CATEGORIES[number]['value'];

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CAT_ICON:  Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.icon]));

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isImage(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/');
}

function isPdf(mimeType: string | null): boolean {
  return mimeType === 'application/pdf';
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocCategory>('OTHER');
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function token() { return localStorage.getItem('accessToken') ?? ''; }

  async function load() {
    setLoading(true);
    try {
      setDocs(await apiGetDocuments(token()));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload() {
    if (!file) { setError('Veuillez sélectionner un fichier.'); return; }
    setUploading(true);
    setError('');
    try {
      const doc = await apiUploadDocument(token(), file, name || file.name, category, notes);
      setDocs((prev) => [doc, ...prev]);
      setShowUpload(false);
      setFile(null); setName(''); setCategory('OTHER'); setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'envoi');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    try {
      await apiDeleteDocument(token(), doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (preview?.id === doc.id) setPreview(null);
    } catch { /* ignore */ }
  }

  const filtered = docs.filter((d) => {
    if (filterCat !== 'ALL' && d.category !== filterCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category for display
  const grouped = CATEGORIES.filter((c) => filtered.some((d) => d.category === c.value));
  const uncategorized = filtered.filter((d) => !CATEGORIES.find((c) => c.value === d.category));

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: '#1a1a18' }}>Mes documents</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#888780' }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''} stocké{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowUpload(true); setError(''); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white"
          style={{ background: '#185FA5' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#888780" strokeWidth="1.2" />
            <path d="M11 11l3 3" stroke="#888780" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg pl-8 pr-3 py-2 text-[13px] outline-none"
            style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto flex-shrink-0">
          {[{ value: 'ALL', label: 'Tous' }, ...CATEGORIES].map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition"
              style={filterCat === c.value
                ? { background: '#185FA5', color: '#FFFFFF' }
                : { background: '#F5F5F3', color: '#888780' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}>
          <div className="text-4xl mb-3">📁</div>
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1a1a18' }}>Aucun document</p>
          <p className="text-[13px]" style={{ color: '#888780' }}>
            {search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez vos documents en cliquant sur "Ajouter".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((doc) => {
            const isImg = isImage(doc.mimeType);
            const isPdfDoc = isPdf(doc.mimeType);
            const fullUrl = doc.url.startsWith('http') ? doc.url : `${apiUrl}${doc.url}`;
            return (
              <div
                key={doc.id}
                className="rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-md"
                style={{ background: '#FFFFFF', border: '0.5px solid #E5E4E0' }}
                onClick={() => setPreview(doc)}
              >
                {/* Thumbnail */}
                <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: '#F5F5F3' }}>
                  {isImg ? (
                    <img src={fullUrl} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{isPdfDoc ? '📄' : CAT_ICON[doc.category] ?? '📁'}</span>
                  )}
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="text-[12px] font-medium truncate" style={{ color: '#1a1a18' }}>{doc.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>
                    {CAT_LABEL[doc.category] ?? doc.category} · {fmtSize(doc.size)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#BCBAB6' }}>{fmtDate(doc.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
            style={{ background: '#FFFFFF' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold" style={{ color: '#1a1a18' }}>Ajouter un document</h2>
              <button onClick={() => setShowUpload(false)} className="p-1.5 rounded-lg" style={{ color: '#888780' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* File picker */}
            <div
              className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition hover:border-[#378ADD]"
              style={{ borderColor: file ? '#378ADD' : '#E5E4E0' }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
                }}
              />
              {file ? (
                <div>
                  <p className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>{file.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>{fmtSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl mb-1">📎</p>
                  <p className="text-[13px] font-medium" style={{ color: '#1a1a18' }}>Choisir un fichier</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>PDF, image, ou tout autre format</p>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Nom du document</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Facture EDF Janvier"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocCategory)}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: '#6B6868' }}>Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Commentaire…"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
                style={{ background: '#F5F5F3', border: '0.5px solid #E5E4E0', color: '#1a1a18' }}
              />
            </div>

            {error && <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>}

            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="w-full rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
              style={{ background: uploading ? '#888780' : '#185FA5' }}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi…
                </span>
              ) : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (() => {
        const fullUrl = preview.url.startsWith('http') ? preview.url : `${apiUrl}${preview.url}`;
        const isImg = isImage(preview.mimeType);
        const isPdfDoc = isPdf(preview.mimeType);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div
              className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
              style={{ background: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#E5E4E0' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: '#1a1a18' }}>{preview.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>
                    {CAT_LABEL[preview.category] ?? preview.category} · {fmtSize(preview.size)} · {fmtDate(preview.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium"
                    style={{ background: '#E6F1FB', color: '#185FA5' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v9M4 8l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Télécharger
                  </a>
                  <button
                    onClick={() => handleDelete(preview)}
                    className="rounded-lg p-1.5"
                    style={{ color: '#DC2626' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => setPreview(null)} className="rounded-lg p-1.5" style={{ color: '#888780' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4">
                {isImg ? (
                  <img src={fullUrl} alt={preview.name} className="w-full rounded-lg object-contain max-h-[60vh]" />
                ) : isPdfDoc ? (
                  <div className="text-center py-8">
                    <p className="text-5xl mb-3">📄</p>
                    <p className="text-[13px]" style={{ color: '#888780' }}>Aperçu PDF non disponible.</p>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-[13px] font-medium"
                      style={{ color: '#185FA5' }}
                    >
                      Ouvrir dans un nouvel onglet →
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-5xl mb-3">{CAT_ICON[preview.category] ?? '📁'}</p>
                    <p className="text-[13px]" style={{ color: '#888780' }}>Aperçu non disponible pour ce type de fichier.</p>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-[13px] font-medium"
                      style={{ color: '#185FA5' }}
                    >
                      Télécharger →
                    </a>
                  </div>
                )}
                {preview.notes && (
                  <div className="mt-3 rounded-lg p-3 text-[12px]" style={{ background: '#F5F5F3', color: '#6B6868' }}>
                    {preview.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
