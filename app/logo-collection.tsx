'use client';
import { useEffect,useRef,useState } from 'react';
import { Trash2,RefreshCw,LockKeyhole,ShieldCheck,Upload,Eraser,Undo2 } from 'lucide-react';
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { originals,matchesLogo,logoScope,groupedLogos,type Logo } from '@/lib/catalog';
import { logoFields,detectedImage,MAX_LOGO_BYTES } from '@/lib/validation';
import { fileFromCanvas, removeLogoBackground as stripLogoBackground } from '@/lib/background';
import { loadImage, clearImageCache } from '@/lib/composite';
import { fetchCatalog } from '@/lib/fetch-catalog';
import { useRefreshOnVisible } from '@/lib/use-refresh-on-visible';
import { supabaseBrowser } from '@/lib/supabase/client';
import AppHeader from './app-header';
import Pick from './picker';
import ActivityTagAdmin from './activity-tag-admin';
import { fallbackActivityTags, type ActivityTag } from '@/lib/tags';

export default function LogoCollection(){
  const [areaFilter,setAreaFilter]=useState('All');
  const [rtFilter,setRtFilter]=useState('All');
  const [typeFilter,setTypeFilter]=useState('All');
  const [uploadArea,setUploadArea]=useState('18');
  const [uploadRt,setUploadRt]=useState('1');
  const [signedIn,setSignedIn]=useState(false);
  const [logos,setLogos]=useState<Logo[]>(originals);
  const [admin,setAdmin]=useState(false);
  const [configured,setConfigured]=useState(true);
  const [loading,setLoading]=useState(true);
  const [catalogError,setCatalogError]=useState('');
  const [name,setName]=useState('');
  const [category,setCategory]=useState('Table');
  const [newFile,setNewFile]=useState<File|null>(null);
  const [logoPreview,setLogoPreview]=useState('');
  const [processingLogo,setProcessingLogo]=useState(false);
  const [canUndoLogo,setCanUndoLogo]=useState(false);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState<Logo|null>(null);
  const [activityTags,setActivityTags]=useState<ActivityTag[]>(fallbackActivityTags());
  const logoInput=useRef<HTMLInputElement>(null);
  const appliedProfile=useRef(false);
  const logoHistory=useRef<File[]>([]);
  const previewUrl=useRef('');

  async function refresh(){
    setLoading(true);
    setCatalogError('');
    try{
      const d=await fetchCatalog();
      clearImageCache();
      setLogos(d.logos);
      setAdmin(d.admin);
      setSignedIn(d.signedIn);
      setConfigured(d.configured);
      if(d.profile&&!appliedProfile.current){
        setAreaFilter(String(d.profile.area));
        setUploadArea(String(d.profile.area));
        setUploadRt(String(d.profile.rt));
        appliedProfile.current=true;
      }
    }catch(e){
      setCatalogError((e as Error).message||'Could not load the logo collection.');
    }finally{
      setLoading(false);
    }
  }

  useRefreshOnVisible(() => { void refresh(); });

  useEffect(()=>{void refresh();},[]);

  async function refreshTags(){
    try{
      const r=await fetch('/api/activity-tags',{cache:'no-store'});
      const d=await r.json() as {tags:ActivityTag[]};
      if(r.ok&&d.tags?.length)setActivityTags(d.tags);
    }catch{
      setActivityTags(fallbackActivityTags());
    }
  }

  useEffect(()=>{if(admin)void refreshTags();},[admin]);

  useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);

  function setLogoFile(file:File|null,clearHistory=false){
    if(previewUrl.current){
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current='';
    }
    if(clearHistory)logoHistory.current=[];
    setCanUndoLogo(logoHistory.current.length>0);
    setNewFile(file);
    if(file){
      previewUrl.current=URL.createObjectURL(file);
      setLogoPreview(previewUrl.current);
    }else{
      setLogoPreview('');
    }
  }

  async function removeLogoBackground(){
    if(!newFile||processingLogo)return;
    setProcessingLogo(true);
    try{
      logoHistory.current.push(newFile);
      setCanUndoLogo(true);
      const image=await loadImage(logoPreview);
      const canvas=stripLogoBackground(image);
      setLogoFile(await fileFromCanvas(canvas,newFile.name));
      toast.success('Logo background removed. Use Undo if you need the original back.');
    }catch(e){
      logoHistory.current.pop();
      setCanUndoLogo(logoHistory.current.length>0);
      toast.error((e as Error).message);
    }finally{
      setProcessingLogo(false);
    }
  }

  function undoLogoEdit(){
    const previous=logoHistory.current.pop();
    if(!previous)return;
    setLogoFile(previous);
    setCanUndoLogo(logoHistory.current.length>0);
    toast.message('Previous logo version restored.');
  }

  async function addLogo(e:React.FormEvent){
    e.preventDefault();
    if(!newFile)return;
    setSaving(true);
    try{
      if(newFile.size>MAX_LOGO_BYTES)throw new Error('Choose an image smaller than 10 MB.');
      const bytes=new Uint8Array(await newFile.arrayBuffer());
      const contentType=detectedImage(bytes);
      if(!contentType)throw new Error('Upload a PNG, JPG or WebP image.');
      const form=new FormData();
      form.set('name',name);
      form.set('category',category);
      form.set('area',uploadArea);
      form.set('rt',uploadRt);
      const fields=logoFields(form,admin);
      const supabase=supabaseBrowser();
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError||!user)throw new Error('Sign in to upload a logo.');
      const id=crypto.randomUUID();
      const objectKey=`${user.id}/${id}`;
      const {error:uploadError}=await supabase.storage.from('logos').upload(objectKey,bytes,{contentType,upsert:false});
      if(uploadError)throw uploadError;
      const {error}=await supabase.from('logos').insert({id,...fields,object_key:objectKey,content_type:contentType,created_by:user.id});
      if(error){
        await supabase.storage.from('logos').remove([objectKey]);
        throw error;
      }
      setName('');
      setLogoFile(null,true);
      if(logoInput.current)logoInput.current.value='';
      await refresh();
      toast.success('Logo added to the shared collection.');
    }catch(e){
      toast.error((e as Error).message);
    }finally{
      setSaving(false);
    }
  }

  async function deleteLogo(){
    if(!deleting)return;
    const item=deleting;
    setDeleting(null);
    setSaving(true);
    try{
      const r=await fetch('/api/logos/'+item.id,{method:'DELETE'});
      const d=await r.json() as {error:string};
      if(!r.ok)throw new Error(d.error);
      await refresh();
      toast.success('Logo removed from the collection.');
    }catch(e){
      toast.error((e as Error).message);
    }finally{
      setSaving(false);
    }
  }

  const visible=logos.filter(l=>matchesLogo(l,areaFilter,rtFilter,typeFilter));
  const groups=groupedLogos(visible);

  return <>
    <Toaster richColors/>
    <AppHeader signedIn={signedIn} page="collection"/>
    <main className="admin-page">
      <div className="intro">
        <div>
          <p className="eyebrow">AREAS 1–18 · SHARED LOGOS</p>
          <h1>Upload and browse logos.</h1>
          <p>Pick the category, Area and Round Table so every logo is listed against the right table or area. Administrators can remove a logo if needed.</p>
        </div>
        <button className="quiet" onClick={refresh}><RefreshCw size={17}/> Refresh</button>
      </div>
      {catalogError&&<div role="alert" className="error">{catalogError}</div>}
      {!configured&&<p className="error">Account services are not connected yet. See SETUP.md in the project package.</p>}
      {loading?<p role="status">Loading…</p>:<div className="admin-grid">
        {signedIn
          ? <div className="admin-stack">
              <form className="panel add-form" onSubmit={addLogo}>
              <h2><Upload size={20}/> Upload a logo</h2>
              <p className="hint">Table logos are named RT 1–400. Area logos are named Area 1–18. Chairman and Official logos need a name.</p>
              <label className="field">Category
                <Pick label="Logo category" value={category} onChange={setCategory} items={(admin?['Table','Area','Chairman','Official']:['Table','Area','Chairman']).map(x=>[x,x])}/>
              </label>
              {category!=='Official'&&<label className="field">Area
                <Pick label="Logo area" value={uploadArea} onChange={setUploadArea} items={Array.from({length:18},(_,i)=>[String(i+1),'Area '+(i+1)])}/>
              </label>}
              {category==='Table'&&<label className="field">Round Table
                <Pick label="Logo round table" value={uploadRt} onChange={setUploadRt} items={Array.from({length:400},(_,i)=>[String(i+1),'RT '+(i+1)])}/>
              </label>}
              {(category==='Chairman'||category==='Official')&&<label className="field">Logo name
                <input required maxLength={100} placeholder={category==='Official'?'e.g. Round Table India':'e.g. Chairman 2026–27'} value={name} onChange={e=>setName(e.target.value)}/>
              </label>}
              <label className="field">Original image
                <input ref={logoInput} type="file" required accept="image/png,image/jpeg,image/webp" onChange={e=>setLogoFile(e.target.files?.[0]||null,true)}/>
              </label>
              {logoPreview&&<div className="upload-preview"><img src={logoPreview} alt="Logo preview"/></div>}
              {newFile&&<div className="image-tools">
                <button type="button" className="secondary" disabled={processingLogo||saving} onClick={()=>void removeLogoBackground()}>
                  <Eraser size={16}/>{processingLogo?'Removing…':'Remove background'}
                </button>
                <button type="button" className="secondary" disabled={!canUndoLogo||processingLogo||saving} onClick={undoLogoEdit}>
                  <Undo2 size={16}/> Undo
                </button>
              </div>}
              <p className="hint">PNG, JPG or WebP · up to 10 MB. Use Remove background for logos on solid black or white boxes — saves as a transparent PNG. Undo restores the original file.</p>
              <button className="primary" disabled={saving||!newFile}>{saving?'Saving…':'Add to shared collection'}</button>
            </form>
            {admin&&<ActivityTagAdmin tags={activityTags} onChange={refreshTags} />}
          </div>
          : <section className="panel access-panel">
              <LockKeyhole size={30}/>
              <h2>Sign in to upload logos</h2>
              <p>Create an account with your email to add Table, Area and Chairman logos. The list on the right still shows the shared collection you can browse after signing in.</p>
              <a className="secondary" href="/login?next=/collection">Sign in</a>
              <a className="text-link" href="/signup?next=/collection">Create an account</a>
            </section>}
        <section className="panel collection">
          <div className="section-line">
            <h2>{visible.length} logo{visible.length===1?'':'s'}</h2>
            <span className="seal"><ShieldCheck size={16}/> {admin?'Admin can delete':'Member access'}</span>
          </div>
          <div className="filter-grid collection-filters">
            <Pick label="Filter by area" value={areaFilter} onChange={setAreaFilter} items={[['All','All areas'],...Array.from({length:18},(_,i)=>[String(i+1),'Area '+(i+1)])]}/>
            <Pick label="Filter by round table" value={rtFilter} onChange={setRtFilter} items={[['All','All RTs'],...Array.from({length:400},(_,i)=>[String(i+1),'RT '+(i+1)])]}/>
          </div>
          <Pick label="Filter logos" value={typeFilter} onChange={setTypeFilter} items={['All','Official','Area','Table','Chairman'].map(x=>[x,x==='All'?'All logo types':x+' logos'])}/>
          <p className="hint">Each row shows the category plus Area and RT when they apply. National / official logos stay visible across areas.</p>
          {groups.map(group=><div className="logo-group" key={group.category}>
            <h3>{group.category} logos</h3>
            {group.items.map(l=><div className="admin-logo" key={l.id}>
              <span className="logo-thumb"><img src={l.url} alt="" key={l.url}/></span>
              <span className="logo-name">
                <strong>{l.name}</strong>
                <small>{logoScope(l)}</small>
              </span>
              {admin&&<button className="delete" disabled={saving} aria-label={'Delete '+l.name} onClick={()=>setDeleting(l)}><Trash2 size={18}/></button>}
            </div>)}
          </div>)}
          {!visible.length&&<p className="muted">No logos match these filters yet. Upload one with the form, or widen the Area / RT filters.</p>}
        </section>
      </div>}
    </main>
    <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open)setDeleting(null);}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the logo from the shared picker. Existing downloaded flyers will not change. You can upload the original again later.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep logo</AlertDialogCancel>
          <AlertDialogAction onClick={deleteLogo}>Delete logo</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
