import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json({ status:'ok', database:'ok', timestamp:new Date().toISOString() });
  } catch {
    return NextResponse.json({ status:'degraded', database:'error' }, { status:503 });
  }
}
