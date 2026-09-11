import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session=await getCurrentSession(); if(!session)return null;
  const customers=await query<{id:string;name:string;type:string;document:string|null;email:string|null;phone:string|null}>(`SELECT id,name,type,document,email,phone FROM customers WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200`,[session.organization_id]);
  return <><div className="page-head"><div><h1>Clientes</h1><p>Cadastro único para orçamento, execução e cobrança.</p></div></div><div className="grid-2">
    <section className="card"><h2>Novo cliente</h2><form method="post" action="/api/customers"><div className="field"><label>Nome / razão social</label><input className="input" name="name" required/></div><div className="field"><label>Tipo</label><select className="select" name="type"><option value="PERSON">Pessoa física</option><option value="COMPANY">Empresa</option></select></div><div className="field"><label>CPF/CNPJ</label><input className="input" name="document"/></div><div className="field"><label>E-mail</label><input className="input" type="email" name="email"/></div><div className="field"><label>Telefone</label><input className="input" name="phone"/></div><div className="form-actions"><button className="btn">Cadastrar</button></div></form></section>
    <section className="card"><h2>Base de clientes</h2><div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Documento</th><th>E-mail</th><th>Telefone</th></tr></thead><tbody>{customers.rows.map(c=><tr key={c.id}><td><strong>{c.name}</strong><br/><span className="muted">{c.type==='COMPANY'?'Empresa':'Pessoa física'}</span></td><td>{c.document||'—'}</td><td>{c.email||'—'}</td><td>{c.phone||'—'}</td></tr>)}</tbody></table>{customers.rowCount===0?<div className="empty">Cadastre o primeiro cliente.</div>:null}</div></section>
  </div></>;
}
