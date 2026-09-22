import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ForumHeader } from "@/app/components/forum-header";
import { UserAvatar } from "@/app/components/user-avatar";
import {
  getCategoryBySlug,
  getTopicPreview,
  getTopicsByCategory,
  type ForumCategory,
} from "@/lib/forumData";
import { getAbsoluteUrl } from "@/lib/site";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  let category: ForumCategory | null = null;

  try {
    category = await getCategoryBySlug(slug);
  } catch {
    return {
      title: "Categoria | Fórum Pixel",
      description: "Conversas da comunidade Fórum Pixel.",
    };
  }

  if (!category) {
    return {
      title: "Categoria não encontrada | Fórum Pixel",
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} | Fórum Pixel`;
  const canonicalUrl = getAbsoluteUrl(`/categoria/${category.slug}`);

  return {
    title,
    description: category.seoDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title,
      description: category.seoDescription,
      url: canonicalUrl,
      siteName: "Fórum Pixel",
      locale: "pt_BR",
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  await connection();
  const { slug } = await params;
  let category = null;
  let categoryTopics = [] as Awaited<ReturnType<typeof getTopicsByCategory>>;
  let dataError = "";

  try {
    [category, categoryTopics] = await Promise.all([
      getCategoryBySlug(slug),
      getTopicsByCategory(slug),
    ]);
  } catch (caughtError) {
    dataError = caughtError instanceof Error
      ? caughtError.message
      : "Não foi possível carregar esta categoria.";
  }

  if (dataError) {
    return (
      <div className="forum-shell category-page">
        <ForumHeader />
        <main className="category-main">
          <div className="search-empty forum-data-error">
            <span>&gt;_</span>
            <strong>ERRO AO LER O FIRESTORE</strong>
            <p>{dataError}</p>
            <Link href="/">← VOLTAR PARA O INÍCIO</Link>
          </div>
        </main>
      </div>
    );
  }

  category = category ?? (categoryTopics[0]
    ? {
        id: slug,
        slug,
        name: categoryTopics[0].categoryName,
        description: "Categoria vinculada a publicações anteriores à migração para o Firestore.",
        seoDescription: `Discussões da categoria ${categoryTopics[0].categoryName} no Fórum Pixel.`,
        tone: categoryTopics[0].tone,
        glyph: "#_",
        number: "--",
        topicsCount: categoryTopics.length,
        status: "active",
      }
    : null);

  if (!category) {
    notFound();
  }

  categoryTopics = categoryTopics.map((topic) => ({ ...topic, tone: category.tone }));

  return (
    <div className="forum-shell category-page">
      <ForumHeader />

      <main className="category-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">&gt;</span>
          <span aria-current="page">{category.name}</span>
        </nav>

        <section className={`category-hero tone-${category.tone}`}>
          <div className="category-hero-icon" aria-hidden="true">{category.glyph}</div>
          <div className="category-hero-copy">
            <p className="eyebrow">/ CATEGORIA_{category.number}</p>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
          </div>
          <div className="category-hero-actions">
            <span><b>{categoryTopics.length}</b> TÓPICOS</span>
            <Link className="forum-button forum-button-primary" href="/novo-topico">
              + NOVO TÓPICO
            </Link>
          </div>
          <span className="category-hero-pixels" aria-hidden="true">▓▒░</span>
        </section>

        <section className="category-topics" aria-labelledby="category-topics-title">
          <header className="category-list-heading">
            <div>
              <p className="eyebrow">/ CONVERSAS RECENTES</p>
              <h2 id="category-topics-title">TÓPICOS EM {category.name.toUpperCase()}</h2>
            </div>
            <span>{categoryTopics.length.toString().padStart(2, "0")} CARREGADO AGORA</span>
          </header>

          {categoryTopics.length > 0 ? (
            <div className="category-topic-list">
              {categoryTopics.map((topic, index) => (
                <Link
                  className={`category-topic-row tone-${topic.tone}`}
                  href={`/topico/${topic.slug}`}
                  key={topic.id}
                >
                  <span className="category-topic-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="category-topic-main">
                    <span className="category-topic-label">{topic.categoryName}</span>
                    <strong>{topic.title}</strong>
                    <span className="category-topic-description">{getTopicPreview(topic.content)}</span>
                    <span className="category-topic-author">
                      <UserAvatar
                        avatarUrl={topic.authorAvatarUrl}
                        initials={topic.authorInitials}
                        className="category-author-avatar"
                        sizes="22px"
                      />
                      <span>POR @{topic.author}</span>
                    </span>
                  </span>
                  <span className="category-topic-stats">
                    <span><b>{topic.repliesCount}</b> RESPOSTAS</span>
                    <span><b>{topic.views}</b> VIEWS</span>
                    <time dateTime={topic.createdAt}>{topic.displayDate}</time>
                  </span>
                  <span className="category-topic-arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="category-empty">
              <span>&gt;_</span>
              <h2>NENHUM TÓPICO AINDA</h2>
              <p>Seja a primeira pessoa a iniciar uma conversa nesta categoria.</p>
              <Link className="forum-button forum-button-primary" href="/novo-topico">+ NOVO TÓPICO</Link>
            </div>
          )}
        </section>

        <footer className="footer">
          <span>FÓRUM PIXEL / DIRETÓRIO: {category.slug.toUpperCase()}</span>
          <Link href="/">← VOLTAR PARA O INÍCIO</Link>
        </footer>
      </main>
    </div>
  );
}
