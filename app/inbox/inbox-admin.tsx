'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Inbox, Mail, RefreshCw, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { Issue, IssueStatus } from '@/lib/issues';
import { fetchCatalog } from '@/lib/fetch-catalog';
import AppHeader from '../app-header';

export default function InboxAdmin() {
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [mail, setMail] = useState({ subject: '', message: '' });
  const [composing, setComposing] = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const catalog = await fetchCatalog();
      setSignedIn(catalog.signedIn);
      setAdmin(catalog.admin);
      if (!catalog.admin) {
        setIssues([]);
        return;
      }
      const response = await fetch('/api/issues', { cache: 'no-store' });
      const data = await response.json() as { issues?: Issue[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not load inbox.');
      setIssues(data.issues ?? []);
    } catch (err) {
      setError((err as Error).message);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const counts = useMemo(() => ({
    open: issues.filter((issue) => issue.status === 'open').length,
    done: issues.filter((issue) => issue.status === 'done').length,
    all: issues.length,
  }), [issues]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (filter !== 'all' && issue.status !== filter) return false;
      if (!needle) return true;
      return [
        issue.name,
        issue.email,
        issue.category,
        issue.message,
        issue.admin_note ?? '',
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [issues, filter, query]);

  const active = visible.find((issue) => issue.id === activeId) ?? visible[0] ?? null;

  useEffect(() => {
    if (!active) {
      setActiveId(null);
      return;
    }
    setActiveId(active.id);
    setNote(active.admin_note ?? '');
    setComposing(false);
    setMail({
      subject: `Re: Flyer Finisher concern: ${active.category}`,
      message: `Hello ${active.name},\n\n`,
    });
    // Sync detail panel when the selected issue changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  async function setStatus(issue: Issue, status: IssueStatus) {
    setBusy(true);
    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note: note }),
      });
      const data = await response.json() as { issue?: Issue; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not update issue.');
      setIssues((rows) => rows.map((row) => (row.id === data.issue!.id ? data.issue! : row)));
      toast.success(status === 'done' ? 'Marked as done.' : 'Reopened.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!active) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/issues/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_note: note }),
      });
      const data = await response.json() as { issue?: Issue; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not save note.');
      setIssues((rows) => rows.map((row) => (row.id === data.issue!.id ? data.issue! : row)));
      toast.success('Note saved.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!active) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/issues/${active.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mail),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not send email.');
      setComposing(false);
      toast.success(`Reply sent to ${active.email}.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function formatWhen(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  return (
    <>
      <Toaster richColors />
      <AppHeader signedIn={signedIn} admin={admin} page="inbox" />
      <main className="admin-page inbox-page">
        <div className="intro">
          <div>
            <p className="eyebrow">ADMIN · SUPPORT</p>
            <h1>Inbox</h1>
            <p>Track raised concerns, reply by email, and mark issues done when they are closed.</p>
          </div>
          <button className="quiet" type="button" onClick={() => void refresh()}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>

        {!signedIn && (
          <section className="panel access-panel">
            <Inbox size={30} />
            <h2>Sign in as an administrator</h2>
            <p>The support inbox is only available to confirmed admin accounts.</p>
            <a className="secondary" href="/login?next=/inbox">Sign in</a>
          </section>
        )}

        {signedIn && !admin && (
          <section className="panel access-panel">
            <ShieldCheck size={30} />
            <h2>Administrator access required</h2>
            <p>Your account can use Flyer Finisher, but it is not marked as admin in Supabase.</p>
          </section>
        )}

        {admin && (
          <>
            {error && <div role="alert" className="error">{error}</div>}
            <div className="inbox-toolbar panel">
              <div className="inbox-filters">
                <button type="button" className={filter === 'open' ? 'primary' : 'secondary'} onClick={() => setFilter('open')}>
                  Open ({counts.open})
                </button>
                <button type="button" className={filter === 'done' ? 'primary' : 'secondary'} onClick={() => setFilter('done')}>
                  Done ({counts.done})
                </button>
                <button type="button" className={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
                  All ({counts.all})
                </button>
              </div>
              <label className="member-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, email, topic or message"
                />
              </label>
            </div>

            {loading ? (
              <p role="status">Loading inbox…</p>
            ) : (
              <div className="inbox-layout">
                <section className="panel inbox-list">
                  {visible.map((issue) => (
                    <button
                      type="button"
                      key={issue.id}
                      className={`inbox-item${active?.id === issue.id ? ' active' : ''}`}
                      onClick={() => setActiveId(issue.id)}
                    >
                      <div className="inbox-item-top">
                        <strong>{issue.name}</strong>
                        <span className={`issue-status ${issue.status}`}>{issue.status}</span>
                      </div>
                      <small>{issue.category}</small>
                      <p>{issue.message}</p>
                      <small className="muted">{formatWhen(issue.created_at)}</small>
                    </button>
                  ))}
                  {!visible.length && <p className="muted">No issues in this view.</p>}
                </section>

                <section className="panel inbox-detail">
                  {!active ? (
                    <div className="access-panel">
                      <Inbox size={28} />
                      <h2>No issue selected</h2>
                      <p>Open concerns appear here so you can reply and mark them done.</p>
                    </div>
                  ) : (
                    <>
                      <div className="section-line">
                        <h2>{active.name}</h2>
                        <span className={`issue-status ${active.status}`}>{active.status}</span>
                      </div>
                      <div className="member-meta">
                        <span>{active.email}</span>
                        <span>{active.category}</span>
                        <span>{formatWhen(active.created_at)}</span>
                      </div>
                      <div className="issue-message">
                        <strong>Message</strong>
                        <p>{active.message}</p>
                      </div>

                      <label className="field">Admin note
                        <textarea
                          maxLength={2000}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Internal note for this issue"
                        />
                      </label>
                      <div className="member-form-actions">
                        <button className="secondary" type="button" disabled={busy} onClick={() => void saveNote()}>Save note</button>
                        {active.status === 'open' ? (
                          <button className="primary" type="button" disabled={busy} onClick={() => void setStatus(active, 'done')}>
                            <CheckCircle2 size={16} /> Mark done
                          </button>
                        ) : (
                          <button className="secondary" type="button" disabled={busy} onClick={() => void setStatus(active, 'open')}>
                            <RotateCcw size={16} /> Reopen
                          </button>
                        )}
                        <button className="secondary" type="button" disabled={busy} onClick={() => setComposing((value) => !value)}>
                          <Mail size={16} /> {composing ? 'Hide reply' : 'Reply by email'}
                        </button>
                      </div>

                      {composing && (
                        <form className="member-form issue-reply" onSubmit={(event) => void sendReply(event)}>
                          <label className="field">Subject
                            <input
                              required
                              maxLength={160}
                              value={mail.subject}
                              onChange={(event) => setMail((current) => ({ ...current, subject: event.target.value }))}
                            />
                          </label>
                          <label className="field">Message
                            <textarea
                              required
                              maxLength={4000}
                              value={mail.message}
                              onChange={(event) => setMail((current) => ({ ...current, message: event.target.value }))}
                            />
                          </label>
                          <button className="primary" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send reply'}</button>
                        </form>
                      )}

                      {active.resolved_at && (
                        <p className="hint">Resolved {formatWhen(active.resolved_at)}</p>
                      )}
                    </>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
