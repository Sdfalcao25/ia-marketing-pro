import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getPrivateFile } from '@/lib/storage';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  const {id}=await params; const file=await getPrivateFile(session.organization_id,id);
  if (!file) return NextResponse.json({error:'not_found'},{status:404});
  const bytes=new Uint8Array(file.content.length);
  bytes.set(file.content);
  return new Response(bytes,{headers:{'Content-Type':file.mime_type,'Content-Length':String(file.byte_size),'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
}
