'use client';

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { getAccessToken } from '@/lib/auth';
import { apiGetHistory, apiClearHistory, apiStreamMessage, ChatMessage } from '@/lib/chat';

// ─── Markdown renderer ────────────────────────────────────────────────────────
// Simple regex-based renderer — handles most of Claude's markdown output.

function renderMarkdown(text: string): string {
  // Code blocks (must come first)
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="bg-zinc-900 text-green-400 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>${escaped.trimEnd()}</code></pre>`;
  });
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-rose-600 rounded px-1 py-0.5 text-xs font-mono">$1</code>');
  // Headings
  text = text.replace(/^### (.+)$/gm, '<h3 class="font-bold text-sm mt-3 mb-1 text-zinc-800">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 class="font-bold text-base mt-4 mb-1 text-zinc-900">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-4 mb-1 text-zinc-900">$1</h1>');
  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Unordered lists
  text = text.replace(/^[•\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Ordered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Wrap consecutive <li> in <ul>/<ol>
  text = text.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="my-1 space-y-0.5">${m}</ul>`);
  // Horizontal rule
  text = text.replace(/^---+$/gm, '<hr class="my-3 border-zinc-200"/>');
  // Double line break → paragraph gap
  text = text.replace(/\n\n/g, '<br/><br/>');
  // Single line break inside paragraphs
  text = text.replace(/\n/g, '<br/>');
  return text;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: '📊', label: 'Résumé financier du mois', prompt: 'Fais-moi un résumé de mes finances ce mois-ci.' },
  { icon: '🧾', label: 'Factures impayées', prompt: 'Quelles sont mes factures impayées en ce moment ?' },
  { icon: '📅', label: 'Prochaines échéances fiscales', prompt: 'Quelles sont mes prochaines déclarations fiscales à venir ?' },
  { icon: '💸', label: 'Dépenses récentes', prompt: 'Montre-moi mes dernières dépenses.' },
  { icon: '📈', label: 'Bilan annuel', prompt: "Quel est mon bilan financier pour l'année en cours ?" },
  { icon: '🏦', label: 'Cotisations URSSAF', prompt: 'Comment sont calculées mes cotisations URSSAF ? Quel est mon taux ?' },
];

// ─── Tool-name labels ─────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  get_financial_summary: 'Analyse financière en cours…',
  get_recent_invoices: 'Consultation des factures…',
  get_recent_expenses: 'Récupération des dépenses…',
  get_tax_deadlines: 'Vérification des échéances fiscales…',
  get_unpaid_invoices_total: 'Calcul des impayés…',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSend = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);
const IconTrash = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconCopy = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconBot = () => (
  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
  </svg>
);

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage & { streaming?: boolean }; isStreaming?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#378ADD] flex items-center justify-center text-xs text-white font-bold">
          Moi
        </div>
      ) : (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
          <IconBot />
        </div>
      )}

      {/* Bubble */}
      <div className={`relative max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-[#378ADD] text-white rounded-tr-sm'
              : 'bg-white text-zinc-800 rounded-tl-sm border border-zinc-100'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <div
              className="prose-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
          )}
          {isStreaming && (
            <span className="inline-flex ml-1 gap-0.5 align-middle">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>

        {/* Copy button (assistant only) */}
        {!isUser && msg.content && !isStreaming && (
          <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 px-1"
          >
            <IconCopy />
            {copied ? 'Copié !' : 'Copier'}
          </button>
        )}

        {/* Timestamp */}
        {msg.createdAt && !isStreaming && (
          <span className={`text-[10px] text-zinc-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Tool indicator ───────────────────────────────────────────────────────────

function ToolIndicator({ tools }: { tools: string[] }) {
  const label = TOOL_LABELS[tools[0]] ?? 'Consultation des données…';
  return (
    <div className="flex items-center gap-2 text-xs text-[#378ADD] bg-[#E6F1FB] border border-[#378ADD] rounded-xl px-3 py-2 w-fit">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#E6F1FB] animate-bounce [animation-delay:300ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type UIMessage = ChatMessage & { streaming?: boolean; toolCalls?: string[] };

export default function ChatPage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // Load history on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setInitialLoading(false); return; }

    apiGetHistory(token)
      .then((history) => {
        setMessages(history.map((m) => ({ ...m })));
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const token = getAccessToken();
    if (!token) return;

    setInput('');
    setError(null);
    setLoading(true);

    // Optimistically add user message
    const userMsg: UIMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add placeholder for streaming assistant reply
    const assistantId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString(), streaming: true },
    ]);

    try {
      let accumulated = '';

      await apiStreamMessage(token, content, (ev) => {
        if (ev.type === 'text') {
          accumulated += ev.text;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          );
        } else if (ev.type === 'tool_calls') {
          setActiveTools(ev.tools);
          setTimeout(() => setActiveTools([]), 3000);
        } else if (ev.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, createdAt: new Date().toISOString() }
                : m,
            ),
          );
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
      setActiveTools([]);
    }
  }, [input, loading]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    const token = getAccessToken();
    if (!token) return;
    await apiClearHistory(token).catch(() => {});
    setMessages([]);
    setShowClearConfirm(false);
  };

  const isEmpty = messages.length === 0 && !initialLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
            <IconBot />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">ComptaFlow IA</p>
            <p className="text-xs text-zinc-400">Assistant comptable · Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En ligne
          </span>
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <IconTrash />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* ── Clear confirm ───────────────────────────────────────────────────── */}
      {showClearConfirm && (
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-sm">
          <span className="text-red-700">Effacer tout l'historique ?</span>
          <div className="flex gap-2">
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs">Annuler</button>
            <button onClick={clearHistory} className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Confirmer</button>
          </div>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {initialLoading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-[#378ADD] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Welcome screen */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Bonjour, je suis ComptaFlow IA</h2>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                Votre assistant comptable intelligent. Je peux analyser vos finances, répondre à vos questions fiscales et consulter vos données en temps réel.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.prompt)}
                  className="flex items-center gap-2.5 p-3 bg-white border border-zinc-200 rounded-xl text-left text-sm hover:border-[#378ADD] hover:bg-[#E6F1FB] hover:shadow-sm transition-all group"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-zinc-700 group-hover:text-[#378ADD] text-xs font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isStreaming={msg.streaming} />
        ))}

        {/* Active tool indicator */}
        {activeTools.length > 0 && (
          <div className="flex flex-row gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
              <IconBot />
            </div>
            <ToolIndicator tools={activeTools} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-200 bg-white px-4 sm:px-6 py-3">
        {/* Quick suggestions (when chat is active) */}
        {messages.length > 0 && !loading && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1.5 hover:border-[#378ADD] hover:bg-[#E6F1FB] hover:text-[#378ADD] transition-colors text-zinc-600"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="Posez votre question comptable… (Entrée pour envoyer, Shift+Entrée pour un saut de ligne)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 h-11 w-11 rounded-xl bg-[#378ADD] text-white flex items-center justify-center shadow hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconSend />
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 text-center mt-2">
          ComptaFlow IA peut faire des erreurs. Vérifiez les informations importantes avec un expert-comptable.
        </p>
      </div>
    </div>
  );
}
