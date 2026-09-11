import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  const [customers,quotes,orders,receivable] = await Promise.all([
    query<{count:string}>('SELECT count(*)::text count FROM customers WHERE organization_id=$1 AND status=\'ACTIVE\'',[session.organization_id]),
    query<{count:string}>('SELECT count(*)::text count FROM quotes WHERE organization_id=$1 AND status IN (\'DRAFT\',\'SENT\')',[session.organization_id]),
    query<{count:string}>('SELECT count(*)::text count FROM work_orders WHERE organization_id=$1 AND status IN (\'OPEN\',\'SCHEDULED\',\'IN_PROGRESS\',\'PAUSED\')',[session.organization_id]),
    query<{total:string}>('SELECT COALESCE(sum(amount),0)::text total FROM payments WHERE organization_id=$1 AND status IN (\'PENDING\',\'OVERDUE\')',[session.organization_id])
  ]);
  const recent = await query<{number:string;title:string;status:string;name:string;created_at:string}>(`SELECT w.number::text,w.title,w.status::text,c.name,w.created_at::text FROM work_orders w JOIN customers c ON c.id=w.customer_id WHERE w.organization_id=$1 ORDER BY w.created_at DESC LIMIT 8`,[session.organization_id]);
  const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(receivable.rows[0].total));
  return <>
    <div className="page-head"><div><h1>Visão geral</h1><p>Operação da {session.organization_name} em tempo real.</p></div></div>
    <section className="stats"><StatCard label="Clientes ativos" value={customers.rows[0].count}/><StatCard label="Orçamentos abertos" value={quotes.rows[0].count}/><StatCard label="OS em operação" value={orders.rows[0].count}/><StatCard label="A receber" value={money}/></section>
    <section className="card"><h2>Ordens de serviço recentes</h2><div className="table-wrap"><table className="table"><thead><tr><th>OS</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Criada em</th></tr></thead><tbody>{recent.rows.map((r)=><tr key={r.number}><td>#{r.number}</td><td>{r.name}</td><td>{r.title}</td><td><span className="badge blue">{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table>{recent.rowCount===0?<div className="empty">Nenhuma OS criada ainda.</div>:null}</div></section>
  </>;
}
