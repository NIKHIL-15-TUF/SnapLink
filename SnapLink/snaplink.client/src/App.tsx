import { useState, useEffect, useCallback } from 'react';
import { createShortUrl, getAllUrls, deleteUrl } from './api/urlApi';
import { useToast } from './hooks/useToast';
import type { ShortUrlResponse } from './types';
import './App.css';

function validateUrl(url: string): string | null {
  if (!url.trim()) return 'Please enter a URL';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'URL must start with http:// or https://';
    return null;
  } catch {
    return 'Please enter a valid URL (e.g. https://example.com)';
  }
}

function ToastContainer({ toasts, onRemove }: { toasts: ReturnType<typeof useToast>['toasts'], onRemove: (id: number) => void }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

function UrlCard({ url, onDelete, onCopy }: {
  url: ShortUrlResponse;
  onDelete: (id: number) => void;
  onCopy: (text: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const shortLink = url.shortUrl || `${window.location.origin}/r/${url.shortCode}`;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(url.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="url-card">
      <div className="url-card-main">
        <div className="url-card-short">
          <a href={shortLink} target="_blank" rel="noopener noreferrer" className="short-link">
            {shortLink}
          </a>
          <button className="btn-icon" onClick={() => onCopy(shortLink)} title="Copy short URL" aria-label="Copy short URL">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <p className="url-card-original" title={url.originalUrl}>{url.originalUrl}</p>
      </div>
      <div className="url-card-meta">
        <span className="url-card-clicks">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {url.clickCount} clicks
        </span>
        <span className="url-card-date">{new Date(url.createdAt).toLocaleDateString()}</span>
        <button
          className="btn-icon btn-danger"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete"
          aria-label="Delete URL"
        >
          {deleting
            ? <span className="spinner-sm" aria-hidden="true" />
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
          }
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      </div>
      <p className="empty-title">No links yet</p>
      <p className="empty-sub">Shorten your first URL above and it'll appear here</p>
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<ShortUrlResponse[]>([]);
  const [fetching, setFetching] = useState(true);
  const [result, setResult] = useState<ShortUrlResponse | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchUrls = useCallback(async () => {
    try {
      const data = await getAllUrls();
      setUrls(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // silent — show empty state
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchUrls(); }, [fetchUrls]);

  function handleUrlChange(val: string) {
    setUrl(val);
    if (urlError) setUrlError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await createShortUrl({ originalUrl: url, customAlias: alias || undefined });
      setResult(data);
      setUrls(prev => [data, ...prev]);
      setUrl('');
      setAlias('');
      addToast('Short link created!', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await deleteUrl(id);
    setUrls(prev => prev.filter(u => u.id !== id));
    if (result?.id === id) setResult(null);
    addToast('Link deleted', 'info');
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard!', 'success');
    } catch {
      addToast('Copy failed — please copy manually', 'error');
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page">
        <header className="hero">
          <div className="hero-badge">Link Shortener</div>
          <h1 className="hero-title">
            <span className="hero-snap">Snap</span>Link
          </h1>
          <p className="hero-sub">Transform long URLs into clean, shareable links instantly</p>
        </header>

        <main className="main">
          <section className="shorten-section" aria-label="Create short link">
            <form className="shorten-form" onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="url-input" className="sr-only">Long URL</label>
                <div className="input-wrapper">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                    </svg>
                  </span>
                  <input
                    id="url-input"
                    type="url"
                    className={`input-url${urlError ? ' input-error' : ''}`}
                    placeholder="Paste your long URL here..."
                    value={url}
                    onChange={e => handleUrlChange(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {urlError && <p className="field-error" role="alert">{urlError}</p>}
              </div>

              <div className="input-row">
                <div className="input-alias">
                  <label htmlFor="alias-input" className="sr-only">Custom alias (optional)</label>
                  <input
                    id="alias-input"
                    type="text"
                    className="input-text"
                    placeholder="Custom alias (optional)"
                    value={alias}
                    onChange={e => setAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                    disabled={loading}
                    maxLength={30}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading
                    ? <><span className="spinner" aria-hidden="true" />Shortening…</>
                    : <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Shorten URL
                      </>
                  }
                </button>
              </div>
            </form>

            {result && (
              <div className="result-banner" role="status">
                <div className="result-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Your short link is ready
                </div>
                <div className="result-link-row">
                  <a
                    href={result.shortUrl || `/r/${result.shortCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="result-link"
                  >
                    {result.shortUrl || `${window.location.origin}/r/${result.shortCode}`}
                  </a>
                  <button
                    className="btn-copy"
                    onClick={() => handleCopy(result.shortUrl || `${window.location.origin}/r/${result.shortCode}`)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="links-section" aria-label="Your links">
            <div className="links-header">
              <h2 className="links-title">Your Links</h2>
              <span className="links-count">{urls.length}</span>
            </div>

            {fetching ? (
              <div className="fetching-state" aria-label="Loading links">
                <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
              </div>
            ) : urls.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="url-list">
                {urls.map(u => (
                  <UrlCard key={u.id} url={u} onDelete={handleDelete} onCopy={handleCopy} />
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="footer">
          <p>Built with SnapLink · Fast, clean URL shortening</p>
        </footer>
      </div>
    </>
  );
}
