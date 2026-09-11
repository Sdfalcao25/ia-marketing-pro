import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function WorkOrdersPage(){
  const s=await getCurrentSession(); if(!s)return null;
  const [customers,orders]=await Promise.all([
    query<{id:string;name:string}>('SELECT id,name FROM customers WHERE organization_id=$1 AND status=\'ACTIVE\' ORDER BY name',[s.organization_id]),
    query<{id:string;number:string;name:string;title:string;status:string;priority:string;amount:string;scheduled_start:string|null}>(`SELECT w.id,w.number::text,c.name,w.title,w.status::text,w.priority::text,w.amount::text,w.scheduled_start::text FROM work_orders w JOIN customers c ON c.id=w.customer_id WHERE w.organization_id=$1 ORDER BY w.created_at DESC LIMIT 200`,[s.organization_id])
  ]);
  const money=(v:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
  return <><div className="page-head"><div><h1>Ordens de serviço</h1><p>Planeje, execute e acompanhe a operação.</p></div></div><div className="grid-2">
    <section className="card"><h2>Nova OS</h2><form method="post" action="/api/work-orders"><div className="field"><label>Cliente</label><select className="select" name="customerId" required><option value="">Selecione</option>{customers.rows.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Título do serviço</label><input className="input" name="title" required/></div><div className="field"><label>Descrição</label><textarea className="textarea" name="description"/></div><div className="field"><label>Prioridade</label><select className="select" name="priority" defaultValue="NORMAL"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></div><div className="field"><label>Agendamento</label><input className="input" type="datetime-local" name="scheduledStart"/></div><div className="field"><label>Valor</label><input className="input" type="number" name="amount" step="0.01" min="0" defaultValue="0"/></div><div className="form-actions"><button className="btn">Abrir OS</button></div></form></section>
    <section className="card"><h2>Operação</h2><div className="table-wrap"><table className="table"><thead><tr><th>OS</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Prioridade</th><th>Valor</th></tr></thead><tbody>{orders.rows.map(o=><tr key={o.id}><td>#{o.number}</td><td>{o.name}</td><td>{o.title}</td><td><span className="badge blue">{o.status}</span></td><td>{o.priority}</td><td>{money(o.amount)}</td></tr>)}</tbody></table>{orders.rowCount===0?<div className="empty">Nenhuma ordem de serviço aberta.</div>:null}</div></section>
  </div></>;
}
