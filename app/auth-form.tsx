'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/validation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' | 'forgot' | 'reset' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [area, setArea] = useState('18');
  const [rt, setRt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (new URLSearchParams(location.search).get('error') === 'expired') {
      setError('This email link has expired or was already used. Sign in or request a new link.');
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const s = supabaseBrowser();
      if ((mode === 'signup' || mode === 'reset') && password !== confirm) {
        throw new Error('The passwords do not match.');
      }
      if (mode === 'signup') {
        if (!name.trim() || Number(rt) < 1 || Number(rt) > 400) {
          throw new Error('Enter your name and select your RT number.');
        }
        const { data, error } = await s.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim(), area: Number(area), rt: Number(rt) },
            emailRedirectTo: location.origin + '/auth/callback',
          },
        });
        if (error) throw error;
        if (data.session) {
          location.assign(safeNext(new URLSearchParams(location.search).get('next')));
          return;
        }
        setMessage('Check your inbox to confirm your email, then sign in. If you already have an account, use the login page.');
      } else if (mode === 'login') {
        const { error } = await s.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.assign(safeNext(new URLSearchParams(location.search).get('next')));
      } else if (mode === 'forgot') {
        const { error } = await s.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth/confirm' });
        if (error) throw error;
        setMessage('If an account exists for this email, a password reset link will arrive shortly.');
      } else {
        const { data: { user } } = await s.auth.getUser();
        if (!user) throw new Error('Open the password reset link from your email first.');
        const { error } = await s.auth.updateUser({ password });
        if (error) throw error;
        await s.auth.signOut();
        location.assign('/login');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
  }[mode];

  const hint = {
    login: 'Sign in to choose and upload logos.',
    signup: 'Join the shared logo collection and finish your flyers.',
    forgot: 'We will email you a link to reset your password.',
    reset: 'Use a password with at least 8 characters.',
  }[mode];

  return (
    <main className="auth-page">
      <Link className="auth-hero" href="/" aria-label="Round Table Flyer Finisher home">
        <Image
          src="/branding/rtilogowhite.png"
          alt="Round Table India"
          width={128}
          height={128}
          className="auth-hero-logo"
          priority
        />
        <span className="brand-copy auth-hero-copy">
          <span className="brand-title">Flyer Finisher</span>
          <span className="brand-sub">Round Table India</span>
        </span>
      </Link>

      <section className="panel auth-card">
        <h1>{title}</h1>
        <p className="hint">{hint}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <label className="field">Full name
                <input autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} />
              </label>
              <div className="auth-selects">
                <label className="field">Area
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger aria-label="Your area"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 18 }, (_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>Area {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="field">Round Table
                  <Select value={rt} onValueChange={setRt}>
                    <SelectTrigger aria-label="Your round table"><SelectValue placeholder="Select RT" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 400 }, (_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>RT {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </>
          )}
          {mode !== 'reset' && (
            <label className="field">Email
              <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          )}
          {mode !== 'forgot' && (
            <label className="field">Password
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'login' ? 1 : 8}
                maxLength={128}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <label className="field">Confirm password
              <input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </label>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          <button className="primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Save new password'}
          </button>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <a href="/signup">Create an account</a>
              <a href="/forgot-password">Forgot password?</a>
            </>
          ) : (
            <a href="/login">Back to sign in</a>
          )}
        </div>
      </section>
    </main>
  );
}
