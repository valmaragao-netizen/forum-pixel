import type { Metadata } from "next";
import Link from "next/link";

import { ForumHeader } from "@/app/components/forum-header";
import { NewTopicAccess } from "@/app/novo-topico/new-topic-access";

export const metadata: Metadata = {
  title: "Criar novo tópico | Fórum Pixel",
  description: "Crie uma nova conversa na comunidade Fórum Pixel.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewTopicPage() {
  return (
    <div className="forum-shell new-topic-page">
      <ForumHeader />

      <main className="new-topic-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">&gt;</span>
          <span aria-current="page">Novo tópico</span>
        </nav>

        <div className="new-topic-layout">
          <section className="composer" aria-labelledby="composer-title">
            <header className="composer-header">
              <p className="eyebrow">/ INICIAR NOVA CONVERSA</p>
              <h1 id="composer-title">CRIAR NOVO TÓPICO<span>_</span></h1>
              <p>Uma boa conversa começa com um título claro e contexto suficiente para a comunidade participar.</p>
            </header>
            <NewTopicAccess />
          </section>

          <aside className="composer-sidebar" aria-label="Orientações para publicação">
            <section className="side-card composer-guide">
              <div className="side-title">
                <h2>ANTES_DE_PUBLICAR</h2>
                <span className="live-dot" />
              </div>
              <ol>
                <li><span>01</span><p><strong>SEJA ESPECÍFICO</strong>Um título direto ajuda as pessoas certas a encontrar sua conversa.</p></li>
                <li><span>02</span><p><strong>ADICIONE CONTEXTO</strong>Conte o que você já pesquisou, testou ou observou.</p></li>
                <li><span>03</span><p><strong>CONVERSE COM RESPEITO</strong>Questione ideias sem atacar quem está do outro lado.</p></li>
              </ol>
            </section>

            <section className="terminal-card" aria-label="Estado da publicação">
              <p><span>&gt;</span> editor carregado</p>
              <p><span>&gt;</span> Firestore preparado</p>
              <p><span>&gt;</span> Storage preparado</p>
              <p><span>&gt;</span> aguardando conteúdo<i>_</i></p>
            </section>

            <Link className="cancel-topic-link" href="/">← CANCELAR E VOLTAR</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
