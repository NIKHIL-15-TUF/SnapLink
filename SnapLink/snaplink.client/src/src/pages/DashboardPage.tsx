import { useState, useEffect, useCallback, useMemo } from 'react';
import { createShortUrl, getAllUrls, deleteUrl } from '../api/urlApi';
import { useToast } from '../hooks/useToast';
import type { ShortUrlResponse, SortField, SortDir, FilterStatus } from '../types';
import '../App.css';

function validateUrl(url: string): string | null {
  if (!url.trim()) return 'Please enter a URL';
  try {
    const p = new URL(url);
    if (!['http:', 'https:'].includes(p.protocol)) return 'URL must start with http:// or https://';
    return null;
  } catch { return 'Please enter a valid URL (e.g. https://example.com)'; }
}

function isExpired(url: ShortUrlResponse) {
  return !!url.expiresAt && new Date(url.expiresAt) < new Date();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtExpiry(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return { label: 'Expired', danger: true };
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return { label: 'Expires today', danger: true };
  if (days <= 3) return { label: days + 'd left', danger: true };
  if (days <= 14) return { label: days + 'd left', danger: false };
  return { label: fmtDate(iso), danger: false };
}

function ToastContainer({ toasts, onRemove }: {
  toasts: { id: number; message: string; type: 'success' | 'error' | 'info' }[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={'toast toast-' + t.type} role="alert">
          <span className="toast-icon">{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IconCalendar = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconEye = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconClock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconLink = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IconSearch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconSort = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>;
const IconGlobe = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
const IconChevron = ({ up }: { up?: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'rotate(180deg)' : undefined }}><polyline points="6 9 12 15 18 9"/></svg>;
const IconBolt = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IconX = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

function UrlCard({ url, onDelete, onCopy }: {
  url: ShortUrlResponse;
  onDelete: (id: number) => void;
  onCopy: (text: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const expired = isExpired(url);
  const shortLink = url.shortUrl || (window.location.origin + '/r/' + url.shortCode);
  const expiry = fmtExpiry(url.expiresAt);

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(url.id); } finally { setDeleting(false); }
  }

  return (
    <div className={'url-card' + (expired ? ' url-card-expired' : '')}>
      <div className="url-card-left">
        <div className="url-card-top">
          <a href={shortLink} target="_blank" rel="noopener noreferrer" className="short-link">{shortLink}</a>
          <button className="btn-icon" onClick={() => onCopy(shortLink)} title="Copy" aria-label="Copy short URL"><IconCopy /></button>
          {expired && <span className="badge badge-expired">Expired</span>}
        </div>
        <p className="url-card-original" title={url.originalUrl}>{url.originalUrl}</p>
        <div className="url-card-meta-row">
          <span className="meta-item"><IconCalendar /> {fmtDate(url.createdAt)}</span>
          <span className="meta-item"><IconEye /> {url.clickCount.toLocaleString()} click{url.clickCount !== 1 ? 's' : ''}</span>
          {expiry && (
            <span className={'meta-item' + (expiry.danger ? ' meta-danger' : '')}><IconClock /> {expiry.label}</span>
          )}
        </div>
      </div>
      <button className="btn-icon btn-danger" onClick={handleDelete} disabled={deleting} title="Delete" aria-label="Delete URL">
        {deleting ? <span className="spinner-sm" aria-hidden="true" /> : <IconTrash />}
      </button>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true"><IconLink /></div>
      <p className="empty-title">{hasFilters ? 'No links match your filters' : 'No links yet'}</p>
      <p className="empty-sub">{hasFilters ? 'Try adjusting your search or filter' : 'Shorten your first URL above'}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortUrlResponse | null>(null);
  const [urls, setUrls] = useState<ShortUrlResponse[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { toasts, addToast, removeToast } = useToast();

  const fetchUrls = useCallback(async () => {
    try { setUrls(await getAllUrls()); }
    catch { /* show empty */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchUrls(); }, [fetchUrls]);

  const stats = useMemo(() => ({
    total: urls.length,
    totalClicks: urls.reduce((s, u) => s + u.clickCount, 0),
    active: urls.filter(u => !isExpired(u)).length,
    expired: urls.filter(isExpired).length,
  }), [urls]);

  const displayed = useMemo(() => {
    let list = [...urls];
    if (filterStatus === 'active') list = list.filter(u => !isExpired(u));
    if (filterStatus === 'expired') list = list.filter(isExpired);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.originalUrl.toLowerCase().includes(q) ||
        u.shortCode.toLowerCase().includes(q) ||
        (u.shortUrl || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av: number, bv: number;
      if (sortField === 'clickCount') { av = a.clickCount; bv = b.clickCount; }
      else if (sortField === 'expiresAt') {
        av = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        bv = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      } else {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [urls, search, sortField, sortDir, filterStatus]);

  function handleUrlChange(val: string) { setUrl(val); if (urlError) setUrlError(''); }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setLoading(true); setResult(null);
    try {
      const data = await createShortUrl({ originalUrl: url, customAlias: alias || undefined, expiresAt: expiresAt || undefined });
      setResult(data);
      setUrls(prev => [data, ...prev]);
      setUrl(''); setAlias(''); setExpiresAt('');
      addToast('Short link created!', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    await deleteUrl(id);
    setUrls(prev => prev.filter(u => u.id !== id));
    if (result?.id === id) setResult(null);
    addToast('Link deleted', 'info');
  }

  async function handleCopy(text: string) {
    try { await navigator.clipboard.writeText(text); addToast('Copied!', 'success'); }
    catch { addToast('Copy failed — copy manually', 'error'); }
  }

  const hasFilters = search.trim() !== '' || filterStatus !== 'all';
  const minExpiry = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="page">

        <header className="hero">
          <div className="hero-badge">Link Shortener</div>
          <h1 className="hero-title"><span className="hero-snap">Snap</span>Link</h1>
          <p className="hero-sub">Transform long URLs into clean, shareable links instantly</p>
        </header>

        <main className="main">
          <section className="shorten-section" aria-label="Create short link">
            <form className="shorten-form" onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="url-input" className="sr-only">Long URL</label>
                <div className="input-wrapper">
                  <span className="input-icon" aria-hidden="true"><IconGlobe /></span>
                  <input
                    id="url-input" type="url"
                    className={'input-url' + (urlError ? ' input-error' : '')}
                    placeholder="Paste your long URL here..."
                    value={url} onChange={e => handleUrlChange(e.target.value)}
                    disabled={loading} autoComplete="off" spellCheck={false}
                  />
                </div>
                {urlError && <p className="field-error" role="alert">{urlError}</p>}
              </div>

              <div className="input-row">
                <input type="text" className="input-text" placeholder="Custom alias (optional)"
                  value={alias} onChange={e => setAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                  disabled={loading} maxLength={30} aria-label="Custom alias" />
                <div className="expiry-wrapper">
                  <span className="expiry-label">Expires</span>
                  <input type="datetime-local" className="input-text input-expiry"
                    value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                    min={minExpiry} disabled={loading} aria-label="Expiration date" />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner" aria-hidden="true" />Shortening…</> : <><IconBolt />Shorten URL</>}
                </button>
              </div>
            </form>

            {result && (
              <div className="result-banner" role="status">
                <div className="result-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Your short link is ready
                </div>
                <div className="result-link-row">
                  <a href={result.shortUrl || '/r/' + result.shortCode} target="_blank" rel="noopener noreferrer" className="result-link">
                    {result.shortUrl || window.location.origin + '/r/' + result.shortCode}
                  </a>
                  <button className="btn-copy" onClick={() => handleCopy(result.shortUrl || window.location.origin + '/r/' + result.shortCode)}>
                    <IconCopy /> Copy
                  </button>
                </div>
              </div>
            )}
          </section>

          {!fetching && urls.length > 0 && (
            <div className="stats-row" aria-label="Summary statistics">
              <StatCard label="Total links" value={stats.total} />
              <StatCard label="Total clicks" value={stats.totalClicks.toLocaleString()} />
              <StatCard label="Active" value={stats.active} />
              {stats.expired > 0 && <StatCard label="Expired" value={stats.expired} />}
            </div>
          )}

          <section className="links-section" aria-label="Your links">
            <div className="dashboard-header">
              <div className="dashboard-title-row">
                <h2 className="links-title">Your Links</h2>
                <span className="links-count">
                  {displayed.length !== urls.length ? displayed.length + '/' + urls.length : urls.length}
                </span>
              </div>

              {!fetching && urls.length > 0 && (
                <div className="dashboard-controls">
                  <div className="search-wrapper">
                    <span className="search-icon" aria-hidden="true"><IconSearch /></span>
                    <input type="text" className="input-search" placeholder="Search URLs or aliases…"
                      value={search} onChange={e => setSearch(e.target.value)} aria-label="Search links" />
                    {search && (
                      <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search"><IconX /></button>
                    )}
                  </div>

                  <div className="filter-tabs" role="group" aria-label="Filter by status">
                    {(['all', 'active', 'expired'] as FilterStatus[]).map(f => (
                      <button key={f}
                        className={'filter-tab' + (filterStatus === f ? ' filter-tab-active' : '')}
                        onClick={() => setFilterStatus(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="filter-count">
                          {f === 'all' ? urls.length : f === 'active' ? stats.active : stats.expired}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="sort-row" role="group" aria-label="Sort links">
                    <span className="sort-label"><IconSort /> Sort:</span>
                    {([
                      { field: 'createdAt' as SortField, label: 'Date' },
                      { field: 'clickCount' as SortField, label: 'Clicks' },
                      { field: 'expiresAt' as SortField, label: 'Expiry' },
                    ]).map(({ field, label }) => (
                      <button key={field}
                        className={'sort-btn' + (sortField === field ? ' sort-btn-active' : '')}
                        onClick={() => toggleSort(field)} aria-pressed={sortField === field}>
                        {label}
                        {sortField === field && <IconChevron up={sortDir === 'asc'} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {fetching ? (
              <div className="fetching-state"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div>
            ) : displayed.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <div className="url-list">
                {displayed.map(u => <UrlCard key={u.id} url={u} onDelete={handleDelete} onCopy={handleCopy} />)}
              </div>
            )}
          </section>
        </main>

        <footer className="footer"><p>Built with SnapLink · Fast, clean URL shortening</p></footer>
      </div>
    </>
  );
}
