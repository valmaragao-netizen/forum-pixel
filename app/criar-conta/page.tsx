import type { Metadata } from "next";
import Link from "next/link";

import { ForumHeader } from "@/app/components/forum-header";
import { SignupForm } from "@/app/criar-conta/signup-form";

export const metadata: Metadata = {
  title: "Criar conta | Fórum Pixel",
  description: "Crie seu perfil para participar do Fórum Pixel.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className="forum-shell auth-page">
      <ForumHeader />
      <main className="auth-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link><span aria-hidden="true">&gt;</span><span aria-current="page">Criar conta</span>
        </nav>
        <section className="auth-card" aria-labelledby="signup-title">
          <header className="auth-card-header">
            <p className="eyebrow">/ NOVO PERFIL</p>
            <h1 id="signup-title">CRIAR CONTA<span>_</span></h1>
            <p>Crie seu acesso para publicar tópicos e participar das discussões.</p>
          </header>
          <SignupForm />
          <footer className="auth-card-footer">
            <span>&gt; já faz parte da comunidade?</span>
            <Link href="/entrar">ENTRAR →</Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
