import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children:React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  return <div className="app-shell"><Sidebar organization={session.organization_name} user={session.name}/><main className="main">{children}</main></div>;
}
