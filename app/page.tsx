import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { ForumHeader } from "@/app/components/forum-header";
import { UserAvatar } from "@/app/components/user-avatar";
import { getCategoryCoverUrl } from "@/lib/categoryCovers";
import {
  applyCategoryData,
  getCategories,
  getForumStats,
  getPublishedTopics,
  getTopicPreview,
  type VisualTone,
} from "@/lib/forumData";

type HomePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function TopicArtwork({ tone, imageUrl }: { tone: VisualTone; imageUrl: string }) {
  const art = tone === "blue" ? "code" : tone === "pink" ? "game" : tone === "yellow" ? "hardware" : "retro";

  if (imageUrl) {
    return (
      <span
        className="topic-image-cover"
        role="img"
        aria-label="Imagem de capa do tópico"
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
      />
    );
  }

  return (
    <span className={`topic-art topic-art-${art}`} aria-hidden="true">
      <span className="art-grid" />
      <span className="art-orb art-orb-one" />
      <span className="art-orb art-orb-two" />
      <span className="art-symbol">{art === "code" ? "{ }" : art === "game" ? "▲ ●" : art === "hardware" ? "▦" : "00:01"}</span>
      <span className="art-scan" />
    </span>
  );
}

export default async function Home({ searchParams }: HomePageProps) {
  await connection();
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("pt-BR");
  let forumCategories = [] as Awaited<ReturnType<typeof getCategories>>;
  let forumTopics = [] as Awaited<ReturnType<typeof getPublishedTopics>>;
  let stats = { users: 0, topics: 0, replies: 0 };
  let dataError = "";

  try {
    [forumCategories, forumTopics, stats] = await Promise.all([
      getCategories(),
      getPublishedTopics(),
      getForumStats(),
    ]);
    forumCategories = applyCategoryData(forumCategories, forumTopics);
  } catch (caughtError) {
    dataError = caughtError instanceof Error
      ? caughtError.message
      : "Não foi possível carregar o Firestore.";
  }

  const visibleTopics = normalizedQuery
    ? forumTopics.filter((topic) =>
        [
          topic.title,
          topic.content,
          topic.categoryName,
          topic.author,
        ].some((field) => field.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
      )
    : forumTopics;

  const forumStats = [
    { label: "USUÁRIOS", value: stats.users.toLocaleString("pt-BR") },
    { label: "TÓPICOS", value: stats.topics.toLocaleString("pt-BR") },
    { label: "RESPOSTAS", value: stats.replies.toLocaleString("pt-BR") },
    { label: "FONTE", value: "FIRESTORE", live: true },
  ] as const;

  return (
    <div className="forum-shell">
      <ForumHeader />

      <main id="inicio" className="main-content">
        <section className="intro">
          <div>
            <p className="eyebrow">/ PRAÇA PÚBLICA · ONLINE 24/7</p>
            <h1>
              Descubra coisas.<br />
              Compartilhe <span>ideias.</span><br />
              Entre na conversa.
            </h1>
            <p className="intro-copy">
              Tecnologia, games, ciência, filmes, programação e outros assuntos.
              Encontre uma ideia, acrescente contexto e deixe a conversa crescer.
            </p>
          </div>
          <div className="live-badge">
            <span><b>● AO VIVO</b> dados sincronizados</span>
            <small>FONTE: CLOUD FIRESTORE</small>
          </div>
        </section>

        <section className="category-section" aria-labelledby="category-title">
          <div className="section-label">
            <div>
              <p className="eyebrow">/ EXPLORE POR ASSUNTO</p>
              <h2 id="category-title">Categorias</h2>
            </div>
            <span>{forumCategories.length.toString().padStart(2, "0")} DIRETÓRIOS</span>
          </div>
          <div className="category-grid">
            {forumCategories.map((category) => (
              <Link key={category.id} className={`category-card tone-${category.tone}`} href={`/categoria/${category.slug}`}>
                <span className="category-card-cover" aria-hidden="true">
                  <Image
                    src={getCategoryCoverUrl(category.slug)}
                    alt=""
                    fill
                    sizes="(max-width: 720px) 50vw, (max-width: 1100px) 25vw, 270px"
                  />
                </span>
                <span className="category-number">/{category.number}</span>
                <span className="category-glyph">{category.glyph}</span>
                <strong>{category.name}</strong>
                <span className="category-count">{category.topicsCount} conversas <b>→</b></span>
              </Link>
            ))}
          </div>
        </section>

        <div className="content-layout">
          <section id="topicos" className="feed-section" aria-labelledby="topics-title">
            <div className="feed-toolbar">
              <div>
                <p className="eyebrow">/ SINAL EM TEMPO REAL</p>
                <h2 id="topics-title">{query ? `Resultados para “${query}”` : "Tópicos em alta"}</h2>
              </div>
              <label className="sort-control">
                <span className="sr-only">Ordenar tópicos</span>
                <select defaultValue="recent" aria-label="Ordenar tópicos">
                  <option value="recent">Mais recentes</option>
                  <option value="popular">Mais comentados</option>
                </select>
              </label>
            </div>

            {visibleTopics.length > 0 ? (
              <div className="topic-feed">
                {visibleTopics.map((topic) => (
                <Link id={`topico-${topic.slug}`} key={topic.id} className={`topic-card tone-${topic.tone}`} href={`/topico/${topic.slug}`}>
                  <span className="topic-visual">
                    <TopicArtwork tone={topic.tone} imageUrl={topic.imageUrl} />
                    <span className="topic-tag">{topic.categoryName}</span>
                  </span>
                  <span className="topic-body">
                    <span className="topic-time">{topic.relativeTime}</span>
                    <strong className="topic-title">{topic.title}</strong>
                    <span className="topic-description">{getTopicPreview(topic.content)}</span>
                    <span className="topic-meta">
                      <span className="author">
                        <UserAvatar
                          avatarUrl={topic.authorAvatarUrl}
                          initials={topic.authorInitials}
                          className="topic-author-avatar"
                          sizes="25px"
                        />
                        <span>@{topic.author}</span>
                      </span>
                      <span className="engagement">
                        <span><b>{topic.repliesCount}</b> respostas</span>
                        <span><b>{topic.views}</b> views</span>
                      </span>
                    </span>
                  </span>
                </Link>
                ))}
              </div>
            ) : (
              <div className="search-empty">
                <span>&gt;_</span>
                <strong>{dataError ? "FIRESTORE INDISPONÍVEL" : "NENHUM TÓPICO ENCONTRADO"}</strong>
                <p>{dataError || "Tente outro termo ou publique a primeira conversa."}</p>
                <Link href="/#topicos">LIMPAR BUSCA →</Link>
              </div>
            )}

            {!query && (
              <button className="load-more" type="button">
                CARREGAR MAIS CONVERSAS <span>[ + ]</span>
              </button>
            )}
          </section>

          <aside className="sidebar" aria-label="Informações do fórum">
            <section className="side-card status-card">
              <div className="side-title">
                <h2>STATUS_DO_FÓRUM</h2>
                <span className="live-dot" />
              </div>
              <dl className="stats-grid">
                {forumStats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd className={"live" in stat && stat.live ? "stat-live" : ""}>
                      {stat.value}{"live" in stat && stat.live && <small>●</small>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="side-card now-card">
              <p className="eyebrow">/ O QUE ESTÁ ROLANDO</p>
              <ul>
                {forumTopics.slice(0, 3).map((topic) => (
                  <li key={topic.id}>
                    <Link href={`/topico/${topic.slug}`}>
                      <span>{topic.title}</span><b>{topic.views}</b>
                    </Link>
                  </li>
                ))}
                {forumTopics.length === 0 && <li><span className="sidebar-empty">aguardando publicações_</span></li>}
              </ul>
            </section>

            <section id="criar-conta" className="join-card">
              <p className="eyebrow">NOVO POR AQUI?</p>
              <h2>Sua próxima conversa começa aqui.</h2>
              <p>Crie seu perfil, encontre sua comunidade e publique sua primeira ideia.</p>
              <Link className="join-button" href="/criar-conta">+ CRIAR CONTA</Link>
              <span className="join-decoration" aria-hidden="true">▓<br />▒▓<br />░▒▓</span>
            </section>

            <section className="terminal-card" aria-label="Estado do sistema">
              <p><span>&gt;</span> sistema online</p>
              <p><span>&gt;</span> versão 0.0.1</p>
              <p><span>&gt;</span> conexão segura<i>_</i></p>
            </section>
          </aside>
        </div>

        <footer className="footer">
          <span>FÓRUM PIXEL v0.0.1 / FEITO PARA IDEIAS GRANDES</span>
          <span>sem algoritmo gritando · só conversa</span>
        </footer>
      </main>
    </div>
  );
}
