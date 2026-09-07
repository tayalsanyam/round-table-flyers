'use client';
import Image from 'next/image';
import Link from 'next/link';
import { FolderOpen, ArrowLeft, MessageCircleWarning, Layers } from 'lucide-react';

type Page = 'studio' | 'collection' | 'concern';

export default function AppHeader({ signedIn, page }: { signedIn: boolean; page: Page }) {
  const next = page === 'collection' ? '/collection' : page === 'concern' ? '/concern' : '/';

  return (
    <header className="topbar">
      <div className="topbar-main">
        <Link className="brand" href="/" aria-label="Round Table Flyer Finisher home">
          <Image src="/branding/rtilogowhite.png" alt="Round Table India" width={112} height={112} className="brand-logo" priority />
          <span className="brand-text">Flyer Finisher<small>Round Table India</small></span>
        </Link>

        <div className="account-actions">
          {signedIn ? (
            <form action="/auth/logout" method="post"><button className="quiet" type="submit">Sign out</button></form>
          ) : (
            <>
              <Link className="quiet" href={`/login?next=${next}`}>Sign in</Link>
              <Link className="quiet" href={`/signup?next=${next}`}>Sign up</Link>
            </>
          )}
        </div>
      </div>

      <nav className="topbar-nav" aria-label="Main">
        {page !== 'studio' && <Link className="quiet" href="/"><Layers size={17} /> Studio</Link>}
        {page !== 'collection' && <Link className="quiet" href="/collection"><FolderOpen size={17} /> Logo collection</Link>}
        {page !== 'concern' && <Link className="quiet" href="/concern"><MessageCircleWarning size={17} /> Raise a concern</Link>}
        {page === 'collection' && <Link className="quiet" href="/"><ArrowLeft size={17} /> Back to studio</Link>}
        {page === 'concern' && <Link className="quiet" href="/"><ArrowLeft size={17} /> Back to studio</Link>}
      </nav>
    </header>
  );
}
