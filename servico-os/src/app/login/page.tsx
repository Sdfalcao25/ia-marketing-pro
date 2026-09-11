import Link from 'next/link';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-wrap">
    <div className="card login-card">
      <Link href="/" className="brand">Serviço<span>OS</span></Link>
      <h1>Acesse sua operação</h1>
      <p>Use seu e-mail e senha.</p>
      {params.error ? <p style={{color:'var(--danger)'}}>Credenciais inválidas ou acesso indisponível.</p> : null}
      <form method="post" action="/api/auth/login">
        <div className="field"><label>E-mail</label><input className="input" type="email" name="email" required autoComplete="email" /></div>
        <div className="field"><label>Senha</label><input className="input" type="password" name="password" required autoComplete="current-password" /></div>
        <button className="btn" style={{width:'100%',marginTop:8}}>Entrar</button>
      </form>
    </div>
  </main>;
}
