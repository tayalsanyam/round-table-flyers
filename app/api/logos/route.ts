import { context,sameOrigin,failure } from '@/lib/server';
import { logoFields,detectedImage,MAX_LOGO_BYTES } from '@/lib/validation';
export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return Response.json({error:'Request not allowed.'},{status:403});
    const {supabase,user,admin}=await context();
    if(!user)return Response.json({error:'Sign in to upload a logo.'},{status:401});
    if(Number(request.headers.get('content-length')||0)>MAX_LOGO_BYTES+500_000)return Response.json({error:'Choose an image smaller than 10 MB.'},{status:413});
    const form=await request.formData();
    let fields;
    try{fields=logoFields(form,admin);}catch(e){return Response.json({error:(e as Error).message},{status:400});}
    const file=form.get('file');
    if(!(file instanceof File)||!file.size||file.size>MAX_LOGO_BYTES)return Response.json({error:'Choose an image smaller than 10 MB.'},{status:400});
    const bytes=new Uint8Array(await file.arrayBuffer()),contentType=detectedImage(bytes);
    if(!contentType)return Response.json({error:'Upload a PNG, JPG or WebP image.'},{status:400});
    const id=crypto.randomUUID(),objectKey=`${user.id}/${id}`;
    const {error:uploadError}=await supabase.storage.from('logos').upload(objectKey,bytes,{contentType,upsert:false});
    if(uploadError)throw uploadError;
    const { tableKind, ...row } = fields;
    const {error}=await supabase.from('logos').insert({id,...row,table_kind:tableKind,object_key:objectKey,content_type:contentType,created_by:user.id});
    if(error){await supabase.storage.from('logos').remove([objectKey]);throw error;}
    return Response.json({ok:true},{status:201});
  }catch(e){return failure(e);}
}
