import { NextResponse } from 'next/server';
import { processNfseJobs, processOutbox } from '@/lib/jobs';

export async function POST(request:Request) {
  const secret=process.env.CRON_SECRET;
  const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if (!secret || supplied!==secret) return NextResponse.json({error:'unauthorized'},{status:401});
  const [outbox,nfse]=await Promise.all([processOutbox(25),processNfseJobs(10)]);
  return NextResponse.json({ok:true,outbox,nfse});
}
