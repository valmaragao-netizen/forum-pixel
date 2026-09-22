import type { Metadata } from "next";
import Link from "next/link";

import { ForumHeader } from "@/app/components/forum-header";
import { LoginForm } from "@/app/entrar/login-form";

export const metadata: Metadata = {
  title: "Entrar | Fórum Pixel",
  description: "Entre na sua conta para participar do Fórum Pixel.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="forum-shell auth-page">
      <ForumHeader />
      <main className="auth-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link><span aria-hidden="true">&gt;</span><span aria-current="page">Entrar</span>
        </nav>
        <section className="auth-card" aria-labelledby="login-title">
          <header className="auth-card-header">
            <p className="eyebrow">/ AUTENTICAÇÃO</p>
            <h1 id="login-title">ENTRAR<span>_</span></h1>
            <p>A leitura é pública. Entre para responder, criar tópicos e participar das conversas.</p>
          </header>
          <LoginForm />
          <footer className="auth-card-footer">
            <span>&gt; ainda não tem uma conta?</span>
            <Link href="/criar-conta">CRIAR CONTA →</Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
