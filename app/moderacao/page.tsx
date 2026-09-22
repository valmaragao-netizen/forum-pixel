import type { Metadata } from "next";
import Link from "next/link";

import { ForumHeader } from "@/app/components/forum-header";
import { ModerationPanel } from "@/app/moderacao/moderation-panel";

export const metadata: Metadata = {
  title: "Moderação | Fórum Pixel",
  description: "Central de moderação do Fórum Pixel.",
  robots: { index: false, follow: false },
};

export default function ModerationPage() {
  return (
    <div className="forum-shell moderation-page">
      <ForumHeader />
      <main className="moderation-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link><span aria-hidden="true">&gt;</span><span aria-current="page">Moderação</span>
        </nav>
        <header className="moderation-hero">
          <p className="eyebrow">/ ACESSO_RESTRITO</p>
          <h1>CENTRAL DE MODERAÇÃO<span>_</span></h1>
          <p>Gerencie as categorias do Firestore e remova conteúdo impróprio sem apagar o histórico de auditoria.</p>
        </header>
        <ModerationPanel />
      </main>
    </div>
  );
}
