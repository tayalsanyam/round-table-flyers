'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { Member } from '@/lib/members';
import { fetchCatalog } from '@/lib/fetch-catalog';
import AppHeader from '../app-header';
import Pick from '../picker';

export default function MembersAdmin() {
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('All');
  const [rtFilter, setRtFilter] = useState('All');
  const [editing, setEditing] = useState<Member | null>(null);
  const [emailing, setEmailing] = useState<Member | null>(null);
  const [form, setForm] = useState({ display_name: '', area: '18', rt: '1' });
  const [mail, setMail] = useState({ subject: '', message: '' });

  async function refreshAccess() {
    const catalog = await fetchCatalog();
    setSignedIn(catalog.signedIn);
    setAdmin(catalog.admin);
    return catalog;
  }

  async function refreshMembers() {
    setLoading(true);
    setError('');
    try {
      const catalog = await refreshAccess();
      if (!catalog.admin) {
        setMembers([]);
        return;
      }
      const response = await fetch('/api/members', { cache: 'no-store' });
      const data = await response.json() as { members?: Member[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not load members.');
      setMembers(data.members ?? []);
    } catch (err) {
      setError((err as Error).message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshMembers();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (areaFilter !== 'All' && member.area !== Number(areaFilter)) return false;
      if (rtFilter !== 'All' && member.rt !== Number(rtFilter)) return false;
      if (!needle) return true;
      const haystack = [
        member.display_name,
        member.email,
        `area ${member.area}`,
        `rt ${member.rt}`,
        `table ${member.rt}`,
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [members, query, areaFilter, rtFilter]);

  function startEdit(member: Member) {
    setEmailing(null);
    if (editing?.id === member.id) {
      setEditing(null);
      return;
    }
    setEditing(member);
    setForm({
      display_name: member.display_name,
      area: String(member.area),
      rt: String(member.rt),
    });
  }

  function startEmail(member: Member) {
    setEditing(null);
    if (emailing?.id === member.id) {
      setEmailing(null);
      return;
    }
    setEmailing(member);
    setMail({
      subject: 'Round Table Flyer Finisher',
      message: `Hello ${member.display_name},\n\n`,
    });
  }

  async function saveMember(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/members/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          area: Number(form.area),
          rt: Number(form.rt),
          fix_logos: true,
        }),
      });
      const data = await response.json() as { member?: Member; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not update member.');
      setMembers((rows) => rows.map((row) => (row.id === data.member!.id ? data.member! : row)));
      setEditing(null);
      toast.success('Member updated.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!emailing) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/members/${emailing.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mail),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not send email.');
      setEmailing(null);
      toast.success(`Email sent to ${emailing.email}.`);
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
      <AppHeader signedIn={signedIn} admin={admin} page="members" />
      <main className="admin-page members-page">
        <div className="intro">
          <div>
            <p className="eyebrow">ADMIN · MEMBERSHIP</p>
            <h1>Members</h1>
            <p>View signups, correct Area / Round Table details, and email members from the same sender used for auth mail.</p>
          </div>
          <button className="quiet" type="button" onClick={() => void refreshMembers()}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>

        {!signedIn && (
          <section className="panel access-panel">
            <Users size={30} />
            <h2>Sign in as an administrator</h2>
            <p>Member management is only available to confirmed admin accounts.</p>
            <a className="secondary" href="/login?next=/members">Sign in</a>
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
            <section className="panel">
              <div className="section-line">
                <h2><Users size={20} /> {filtered.length} member{filtered.length === 1 ? '' : 's'}</h2>
                <label className="member-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name or email"
                  />
                </label>
              </div>
              <div className="filter-grid collection-filters member-filters">
                <Pick
                  label="Filter by area"
                  value={areaFilter}
                  onChange={setAreaFilter}
                  items={[['All', 'All areas'], ...Array.from({ length: 18 }, (_, i) => [String(i + 1), `Area ${i + 1}`])]}
                />
                <Pick
                  label="Filter by round table"
                  value={rtFilter}
                  onChange={setRtFilter}
                  items={[['All', 'All RTs'], ...Array.from({ length: 400 }, (_, i) => [String(i + 1), `RT ${i + 1}`])]}
                />
              </div>

              {loading ? (
                <p role="status">Loading members…</p>
              ) : (
                <div className="member-list">
                  {filtered.map((member) => {
                    const isEditing = editing?.id === member.id;
                    const isEmailing = emailing?.id === member.id;
                    const isOpen = isEditing || isEmailing;
                    return (
                      <article className={`member-row${isOpen ? ' is-open' : ''}`} key={member.id}>
                        <div className="member-main">
                          <strong>{member.display_name}</strong>
                          <small>{member.email}</small>
                          <div className="member-meta">
                            <span>Area {member.area}</span>
                            <span>RT {member.rt}</span>
                            <span>{member.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}</span>
                            {member.is_admin && <span className="seal">Admin</span>}
                          </div>
                          <small className="muted">Last sign-in: {formatWhen(member.last_sign_in_at)}</small>
                          <div className="member-actions">
                            <button type="button" className="secondary" disabled={busy} onClick={() => startEdit(member)}>
                              <Pencil size={16} /> Edit
                            </button>
                            <button type="button" className="secondary" disabled={busy} onClick={() => startEmail(member)}>
                              <Mail size={16} /> Email
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="member-inline-panel">
                            <h2><Pencil size={18} /> Edit member</h2>
                            <p className="hint">{member.email}</p>
                            <form className="member-form" onSubmit={(event) => void saveMember(event)}>
                              <label className="field">Display name
                                <input
                                  required
                                  maxLength={100}
                                  value={form.display_name}
                                  onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                                />
                              </label>
                              <label className="field">Area
                                <Pick
                                  label="Member area"
                                  value={form.area}
                                  onChange={(value) => setForm((current) => ({ ...current, area: value }))}
                                  items={Array.from({ length: 18 }, (_, index) => [String(index + 1), `Area ${index + 1}`])}
                                />
                              </label>
                              <label className="field">Round Table
                                <Pick
                                  label="Member round table"
                                  value={form.rt}
                                  onChange={(value) => setForm((current) => ({ ...current, rt: value }))}
                                  items={Array.from({ length: 400 }, (_, index) => [String(index + 1), `RT ${index + 1}`])}
                                />
                              </label>
                              <p className="hint">Saving also updates matching Area/Table logos this member uploaded under the old numbers.</p>
                              <div className="member-form-actions">
                                <button className="primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save changes'}</button>
                                <button className="quiet" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                              </div>
                            </form>
                          </div>
                        )}

                        {isEmailing && (
                          <div className="member-inline-panel">
                            <h2><Mail size={18} /> Email member</h2>
                            <p className="hint">To: {member.email}</p>
                            <form className="member-form" onSubmit={(event) => void sendEmail(event)}>
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
                              <div className="member-form-actions">
                                <button className="primary" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send email'}</button>
                                <button className="quiet" type="button" disabled={busy} onClick={() => setEmailing(null)}>Cancel</button>
                              </div>
                            </form>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {!filtered.length && <p className="muted">No members match this search.</p>}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
