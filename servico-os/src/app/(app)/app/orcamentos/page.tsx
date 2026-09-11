import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function QuotesPage(){
  const s=await getCurrentSession(); if(!s)return null;
  const [customers,quotes]=await Promise.all([
    query<{id:string;name:string}>('SELECT id,name FROM customers WHERE organization_id=$1 AND status=\'ACTIVE\' ORDER BY name',[s.organization_id]),
    query<{id:string;number:string;name:string;status:string;total:string;created_at:string}>(`SELECT q.id,q.number::text,c.name,q.status::text,q.total::text,q.created_at::text FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.organization_id=$1 ORDER BY q.created_at DESC LIMIT 200`,[s.organization_id])
  ]);
  const money=(v:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
  return <><div className="page-head"><div><h1>Orçamentos</h1><p>Propostas numeradas e isoladas por empresa.</p></div></div><div className="grid-2">
    <section className="card"><h2>Novo orçamento</h2><form method="post" action="/api/quotes"><div className="field"><label>Cliente</label><select className="select" name="customerId" required><option value="">Selecione</option>{customers.rows.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Serviço</label><input className="input" name="description" required/></div><div className="field"><label>Quantidade</label><input className="input" type="number" name="quantity" step="0.001" min="0.001" defaultValue="1" required/></div><div className="field"><label>Valor unitário</label><input className="input" type="number" name="unitPrice" step="0.01" min="0" required/></div><div className="field"><label>Validade</label><input className="input" type="date" name="validUntil"/></div><div className="field"><label>Observações</label><textarea className="textarea" name="notes"/></div><div className="form-actions"><button className="btn">Criar orçamento</button></div></form></section>
    <section className="card"><h2>Propostas</h2><div className="table-wrap"><table className="table"><thead><tr><th>Nº</th><th>Cliente</th><th>Status</th><th>Total</th><th>Data</th></tr></thead><tbody>{quotes.rows.map(q=><tr key={q.id}><td>#{q.number}</td><td>{q.name}</td><td><span className="badge amber">{q.status}</span></td><td>{money(q.total)}</td><td>{new Date(q.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table>{quotes.rowCount===0?<div className="empty">Nenhum orçamento ainda.</div>:null}</div></section>
  </div></>;
}
