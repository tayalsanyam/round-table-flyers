'use client';
import { FolderOpen,ArrowLeft } from 'lucide-react';
export default function AppHeader({signedIn,page}:{signedIn:boolean;page:'studio'|'collection'}){
  return <header className="topbar">
    <a className="brand" href="/" aria-label="Round Table Flyer Finisher home"><span className="monogram">RT<span>INDIA</span></span><span>Flyer Finisher<small>ROUND TABLE INDIA · AREAS 1–18</small></span></a>
    {page==='studio'
      ? <a className="quiet" href="/collection"><FolderOpen size={17}/> Logo collection</a>
      : <a className="quiet" href="/"><ArrowLeft size={17}/> Back to studio</a>}
    <div className="account-actions">{signedIn
      ? <form action="/auth/logout" method="post"><button className="quiet">Sign out</button></form>
      : <><a className="quiet" href={`/login?next=${page==='collection'?'/collection':'/'}`}>Sign in</a><a className="quiet" href={`/signup?next=${page==='collection'?'/collection':'/'}`}>Sign up</a></>}
    </div>
  </header>;
}
