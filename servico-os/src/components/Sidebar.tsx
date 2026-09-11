import Link from 'next/link';

export function Sidebar({ organization, user }: { organization:string; user:string }) {
  return <aside className="sidebar">
    <div className="brand">Serviço<span>OS</span></div>
    <nav className="nav">
      <Link href="/app">Visão geral</Link>
      <Link href="/app/clientes">Clientes</Link>
      <Link href="/app/orcamentos">Orçamentos</Link>
      <Link href="/app/os">Ordens de serviço</Link>
    </nav>
    <div className="sidebar-footer">
      <strong style={{color:'#fff'}}>{organization}</strong><br/>{user}
      <form method="post" action="/api/auth/logout" style={{marginTop:10}}><button style={{background:'none',border:0,color:'#aeb7cf',padding:0,cursor:'pointer'}}>Sair</button></form>
    </div>
  </aside>;
}
