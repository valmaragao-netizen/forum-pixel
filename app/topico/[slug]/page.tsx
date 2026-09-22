import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ForumHeader } from "@/app/components/forum-header";
import { UserAvatar } from "@/app/components/user-avatar";
import {
  ReplyShortcut,
  TopicReplyBox,
} from "@/app/components/topic-interactions";
import { TopicViewTracker } from "@/app/components/topic-view-tracker";
import {
  getCategoryBySlug,
  getPublishedTopics,
  getRepliesByTopic,
  getTopicBySlug,
  type ForumTopic,
} from "@/lib/forumData";
import { getAbsoluteUrl } from "@/lib/site";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  let topic = null;

  try {
    topic = await getTopicBySlug(slug);
  } catch {
    return {
      title: "Tópico | Fórum Pixel",
      description: "Discussão publicada na comunidade Fórum Pixel.",
    };
  }

  if (!topic) {
    return {
      title: "Tópico não encontrado | Fórum Pixel",
      robots: { index: false, follow: false },
    };
  }

  const title = `${topic.title} | Fórum Pixel`;
  const description = topic.summary;
  const canonicalUrl = getAbsoluteUrl(`/topico/${topic.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalUrl,
      siteName: "Fórum Pixel",
      locale: "pt_BR",
      publishedTime: topic.createdAt,
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  await connection();
  const { slug } = await params;
  let topic: ForumTopic | null = null;
  let dataError = "";

  try {
    topic = await getTopicBySlug(slug);
  } catch (caughtError) {
    dataError = caughtError instanceof Error
      ? caughtError.message
      : "Não foi possível carregar este tópico.";
  }

  if (dataError) {
    return (
      <div className="forum-shell topic-page">
        <ForumHeader />
        <main className="topic-main">
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

  if (!topic) {
    notFound();
  }

  const [storedCategory, replies, allTopics] = await Promise.all([
    getCategoryBySlug(topic.categorySlug),
    getRepliesByTopic(topic.id),
    getPublishedTopics(),
  ]);
  const category = storedCategory ?? {
    id: topic.categorySlug,
    slug: topic.categorySlug,
    name: topic.categoryName,
    description: "Categoria vinculada a uma publicação anterior à migração para o Firestore.",
    seoDescription: topic.summary,
    tone: topic.tone,
    glyph: "#_",
    number: "--",
    topicsCount: 0,
    status: "active" as const,
  };

  const relatedTopics = allTopics
    .filter((candidate) => candidate.id !== topic.id)
    .sort((left, right) => Number(right.categorySlug === topic.categorySlug) - Number(left.categorySlug === topic.categorySlug))
    .slice(0, 3);
  const categoryTopicsCount = allTopics.filter((candidate) => candidate.categorySlug === topic.categorySlug).length;
  const canonicalUrl = getAbsoluteUrl(`/topico/${topic.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: topic.title,
    author: {
      "@type": "Person",
      name: topic.author,
    },
    datePublished: topic.createdAt,
    text: topic.content,
    url: canonicalUrl,
    articleSection: topic.categoryName,
    commentCount: replies.length,
  };

  return (
    <div className="forum-shell topic-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <ForumHeader />
      <TopicViewTracker topicId={topic.id} />

      <main className="topic-main">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">&gt;</span>
          <Link href={`/categoria/${topic.categorySlug}`}>{topic.categoryName}</Link>
          <span aria-hidden="true">&gt;</span>
          <span aria-current="page">{topic.title}</span>
        </nav>

        <div className="topic-page-layout">
          <div className="topic-column">
            <article className="topic-post">
              <header className="topic-post-header">
                <div className="topic-post-flags">
                  <span className="post-category">{topic.categoryName}</span>
                  <span className="post-id">TÓPICO_ORIGINAL</span>
                </div>
                <h1>{topic.title}</h1>
                <div className="post-meta-line">
                  <span>PUBLICADO EM <time dateTime={topic.createdAt}>{topic.displayDate}</time></span>
                  <span><b>{topic.views}</b> VISUALIZAÇÕES</span>
                </div>
              </header>

              {topic.imageUrl && (
                <div
                  className="topic-cover-image"
                  role="img"
                  aria-label={`Imagem de capa: ${topic.title}`}
                  style={{ backgroundImage: `url(${JSON.stringify(topic.imageUrl)})` }}
                />
              )}

              <div className="topic-post-content">
                <aside className="post-author" aria-label={`Publicado por ${topic.author}`}>
                  <UserAvatar
                    avatarUrl={topic.authorAvatarUrl}
                    initials={topic.authorInitials}
                    className="user-avatar-large"
                    sizes="62px"
                  />
                  <strong>@{topic.author}</strong>
                  <small>AUTOR DO TÓPICO</small>
                  <span className="user-online">● ONLINE</span>
                </aside>
                <div className="post-copy">
                  <p>{topic.content}</p>
                  <div className="post-signature">
                    <span>mensagem_enviada.exe</span>
                    <span>#{topic.slug}</span>
                  </div>
                </div>
              </div>
            </article>

            <section className="replies-section" aria-labelledby="replies-title">
              <div className="replies-heading">
                <div>
                  <p className="eyebrow">/ CONVERSA EM ANDAMENTO</p>
                  <h2 id="replies-title">{replies.length} RESPOSTAS</h2>
                </div>
                <span>ORDEM: MAIS ANTIGAS</span>
              </div>

              <div className="reply-list">
                {replies.map((reply, index) => (
                  <article className="reply-card" key={reply.id}>
                    <aside className="reply-author">
                      <UserAvatar
                        avatarUrl={reply.authorAvatarUrl}
                        initials={reply.initials}
                      />
                      <strong>@{reply.author}</strong>
                    </aside>
                    <div className="reply-content">
                      <header>
                        <time dateTime={reply.createdAt}>{reply.displayDate}</time>
                        <a href={`#resposta-${reply.id}`} id={`resposta-${reply.id}`} aria-label={`Resposta ${reply.id}`}>
                          #{index + 1}
                        </a>
                      </header>
                      <p>{reply.content}</p>
                      <ReplyShortcut />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <TopicReplyBox
              topicId={topic.id}
              topicSlug={topic.slug}
              topicTitle={topic.title}
              topicAuthorId={topic.authorId}
            />
          </div>

          <aside className="topic-sidebar" aria-label="Informações complementares">
            <section className="side-card category-info-card">
              <div className="side-title">
                <h2>SOBRE_A_CATEGORIA</h2>
                <span className="category-chip-icon">{category.glyph}</span>
              </div>
              <div className="category-info-body">
                <p className="eyebrow">/{category.name}</p>
                <h3>{category.name}, ideias e conversas.</h3>
                <p>{category.description}</p>
                <dl>
                  <div><dt>TÓPICOS</dt><dd>{categoryTopicsCount}</dd></div>
                  <div><dt>RESPOSTAS</dt><dd>{replies.length}</dd></div>
                </dl>
              </div>
            </section>

            <section className="side-card related-card">
              <div className="side-title"><h2>TÓPICOS_RELACIONADOS</h2></div>
              <ul>
                {relatedTopics.map((relatedTopic, index) => (
                  <li key={relatedTopic.id}>
                    <Link href={`/topico/${relatedTopic.slug}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>{relatedTopic.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Link className="new-topic-button" href="/novo-topico">
              <span>+</span>
              <strong>CRIAR NOVO TÓPICO</strong>
              <small>COMPARTILHE UMA IDEIA</small>
            </Link>

            <section className="terminal-card" aria-label="Estado do tópico">
              <p><span>&gt;</span> tópico carregado</p>
              <p><span>&gt;</span> {replies.length} respostas encontradas</p>
              <p><span>&gt;</span> aguardando sua mensagem<i>_</i></p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
