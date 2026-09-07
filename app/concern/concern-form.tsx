'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import AppHeader from '../app-header';

const categories = [
  'Account or login',
  'Logo upload or collection',
  'Flyer editor or download',
  'Privacy or data',
  'Other',
];

export default function ConcernForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/concern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not send your message.');
      setSent(true);
      toast.success('Your concern was sent. We will reply by email.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader signedIn={false} page="concern" />
      <main className="concern-page">
        <section className="concern-hero panel">
          <p className="eyebrow">AREA 18 · SUPPORT</p>
          <h1>Raise a concern</h1>
          <p>Questions about accounts, logos, uploads or the flyer editor? Send a note and the Area 18 team will respond by email.</p>
        </section>

        <section className="panel concern-card">
          {sent ? (
            <div className="concern-success">
              <h2>Thank you</h2>
              <p>Your message is on its way. If this is urgent, call <a href="tel:+917009191914">+91-7009191914</a>.</p>
              <a className="secondary" href="/">Back to studio</a>
            </div>
          ) : (
            <form className="concern-form" onSubmit={submit}>
              <label className="field">Your name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
              <label className="field">Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
              <label className="field">Topic
                <select className="native-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="field">Your message<textarea required rows={6} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your doubt or concern. Include your Area and RT if relevant." /></label>
              <p className="hint">Do not share passwords. We only use your email to reply to this message.</p>
              <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send concern'}</button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
