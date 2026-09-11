import Link from 'next/link';

export default function HomePage() {
  return <main className="landing">
    <header className="topbar">
      <div className="brand">Serviço<span>OS</span></div>
      <Link className="btn secondary" href="/login">Entrar</Link>
    </header>
    <section className="hero">
      <div>
        <span className="eyebrow">Sistema operacional para prestadores</span>
        <h1>Da proposta ao recebimento, sem perder o controle.</h1>
        <p>Clientes, orçamentos, agenda, ordens de serviço, execução, cobrança e pós-venda em um fluxo simples para equipes que trabalham de verdade.</p>
        <div className="actions"><Link className="btn" href="/login">Acessar demonstração</Link><a className="btn secondary" href="#produto">Conhecer o produto</a></div>
      </div>
      <div className="demo-card" id="produto">
        <p className="muted">Visão operacional</p>
        <div className="metric-grid">
          <div className="mini"><strong>18</strong><span>OS em andamento</span></div>
          <div className="mini"><strong>R$ 24,8k</strong><span>a receber</span></div>
          <div className="mini"><strong>7</strong><span>orçamentos abertos</span></div>
          <div className="mini"><strong>96%</strong><span>execuções no prazo</span></div>
        </div>
      </div>
    </section>
  </main>;
}
