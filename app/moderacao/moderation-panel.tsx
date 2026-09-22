"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AuthRequiredPanel } from "@/app/components/auth-required-panel";
import { useAuth } from "@/app/providers/auth-provider";
import {
  DEFAULT_CATEGORIES,
  createCategory,
  createCategorySlug,
  installDefaultCategories,
} from "@/lib/firestoreCategories";
import { getCategories, type ForumCategory, type VisualTone } from "@/lib/forumData";
import {
  getModerationItems,
  softDeleteContent,
  type ModerationItem,
  type ModerationTargetType,
} from "@/lib/moderation";

type ModerationState = {
  categories: ForumCategory[];
  topics: ModerationItem[];
  replies: ModerationItem[];
};

const emptyState: ModerationState = { categories: [], topics: [], replies: [] };

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
    : "data pendente";
}

export function ModerationPanel() {
  const { user, isModerator, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ModerationState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (!isModerator) {
      return;
    }

    let active = true;

    async function loadItems() {
      try {
        const [result, categories] = await Promise.all([
          getModerationItems(),
          getCategories(),
        ]);

        if (active) {
          setItems({ ...result, categories });
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Não foi possível carregar a moderação.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      active = false;
    };
  }, [isModerator]);

  async function handleDelete(type: ModerationTargetType, id: string) {
    if (!user || !window.confirm("Excluir este conteúdo da área pública?")) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await softDeleteContent(type, id, user.uid);
      setItems((current) => ({
        categories: current.categories,
        topics:
          type === "topic"
            ? current.topics.filter((item) => item.id !== id)
            : current.topics,
        replies:
          type === "reply"
            ? current.replies.filter((item) => item.id !== id)
            : current.replies,
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível excluir o conteúdo.",
      );
    } finally {
      setDeletingId("");
    }
  }

  async function refreshCategories() {
    const categories = await getCategories();
    setItems((current) => ({ ...current, categories }));
  }

  if (authLoading) {
    return <div className="auth-loading-panel auth-loading-panel-large"><span>&gt;</span> verificando permissão<i>_</i></div>;
  }

  if (!user) {
    return (
      <AuthRequiredPanel
        message="Faça login para acessar a moderação."
        detail="Esta área é restrita a moderadores do Fórum Pixel."
      />
    );
  }

  if (!isModerator) {
    return (
      <div className="moderation-denied">
        <span>&gt;_</span>
        <h2>ACESSO NEGADO</h2>
        <p>Sua conta não possui a função de moderador.</p>
      </div>
    );
  }

  return (
    <div className="moderation-content">
      {error && <p className="auth-form-error" role="alert"><span>!</span> {error}</p>}

      {loading ? (
        <div className="auth-loading-panel auth-loading-panel-large"><span>&gt;</span> carregando conteúdo<i>_</i></div>
      ) : (
        <>
          <CategoryManager
            moderatorId={user.uid}
            categories={items.categories}
            onCreated={refreshCategories}
          />
          <ModerationList
            title="TÓPICOS_PUBLICADOS"
            items={items.topics.filter((item) => item.status === "published")}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
          <ModerationList
            title="RESPOSTAS_PUBLICADAS"
            items={items.replies.filter((item) => item.status === "published")}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function CategoryManager({
  moderatorId,
  categories,
  onCreated,
}: {
  moderatorId: string;
  categories: ForumCategory[];
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setFormError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createCategory(moderatorId, {
        name,
        slug,
        description: String(formData.get("description") ?? ""),
        seoDescription: String(formData.get("seoDescription") ?? ""),
        glyph: String(formData.get("glyph") ?? ""),
        tone: String(formData.get("tone") ?? "cyan") as VisualTone,
        number: String(formData.get("number") ?? "00"),
      });
      form.reset();
      setName("");
      setSlug("");
      setMessage("Categoria criada no Firestore.");
      await onCreated();
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleInstallDefaults() {
    setSaving(true);
    setMessage("");
    setFormError("");

    try {
      const installedCount = await installDefaultCategories(moderatorId);
      setMessage(
        installedCount > 0
          ? `${installedCount} ${installedCount === 1 ? "categoria instalada" : "categorias instaladas"} no Firestore.`
          : "Todas as categorias padrão já estão instaladas.",
      );
      await onCreated();
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Não foi possível instalar as categorias.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="moderation-section category-manager">
      <header>
        <h2>CATEGORIAS_DO_FIRESTORE</h2>
        <span>{categories.length.toString().padStart(2, "0")} ATIVAS</span>
      </header>

      <div className="moderation-category-body">
        {categories.length > 0 ? (
          <div className="moderation-category-chips">
            {categories.map((category) => (
              <span className={`tone-${category.tone}`} key={category.id}>
                <b>{category.number}</b> {category.glyph} {category.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="moderation-empty">&gt; Nenhuma categoria ativa. Instale as padrões ou crie a primeira.</p>
        )}

        <form className="moderation-category-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="category-name">NOME</label>
            <input
              id="category-name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                setSlug(createCategorySlug(nextName));
              }}
              minLength={2}
              maxLength={40}
              placeholder="Ex.: Ciência"
              disabled={saving}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="category-slug">SLUG</label>
            <input id="category-slug" value={slug} readOnly required />
          </div>

          <div className="form-field category-form-wide">
            <label htmlFor="category-description">DESCRIÇÃO</label>
            <textarea id="category-description" name="description" minLength={20} maxLength={240} rows={3} disabled={saving} required />
          </div>

          <div className="form-field category-form-wide">
            <label htmlFor="category-seo">DESCRIÇÃO SEO</label>
            <textarea id="category-seo" name="seoDescription" minLength={20} maxLength={260} rows={3} disabled={saving} required />
          </div>

          <div className="form-field">
            <label htmlFor="category-glyph">GLIFO</label>
            <input id="category-glyph" name="glyph" maxLength={8} defaultValue="#_" disabled={saving} required />
          </div>

          <div className="form-field">
            <label htmlFor="category-number">NÚMERO</label>
            <input id="category-number" name="number" pattern="[0-9]{2}" maxLength={2} placeholder="05" disabled={saving} required />
          </div>

          <div className="form-field">
            <label htmlFor="category-tone">COR</label>
            <div className="select-frame">
              <select id="category-tone" name="tone" defaultValue="cyan" disabled={saving}>
                <option value="blue">Azul</option>
                <option value="pink">Rosa</option>
                <option value="yellow">Amarelo</option>
                <option value="cyan">Ciano</option>
              </select>
              <span aria-hidden="true">▼</span>
            </div>
          </div>

          <div className="moderation-category-actions category-form-wide">
            <button className="forum-button forum-button-primary" type="submit" disabled={saving || !slug}>
              {saving ? "SALVANDO..." : "+ CRIAR CATEGORIA"}
            </button>
            <button className="forum-button forum-button-ghost" type="button" onClick={() => void handleInstallDefaults()} disabled={saving}>
              INSTALAR {DEFAULT_CATEGORIES.length} PADRÕES
            </button>
          </div>

          {(formError || message) && (
            <p className={formError ? "auth-form-error category-form-wide" : "publish-success category-form-wide"} role={formError ? "alert" : "status"}>
              <span>{formError ? "!" : "✓"}</span> {formError || message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

function ModerationList({
  title,
  items,
  deletingId,
  onDelete,
}: {
  title: string;
  items: ModerationItem[];
  deletingId: string;
  onDelete: (type: ModerationTargetType, id: string) => Promise<void>;
}) {
  return (
    <section className="moderation-section">
      <header>
        <h2>{title}</h2>
        <span>{items.length.toString().padStart(2, "0")} ITENS</span>
      </header>

      {items.length === 0 ? (
        <p className="moderation-empty">&gt; Nenhum conteúdo publicado encontrado.</p>
      ) : (
        <div className="moderation-list">
          {items.map((item) => (
            <article className="moderation-item" key={`${item.type}-${item.id}`}>
              <div>
                <span>{item.type === "topic" ? "TÓPICO" : "RESPOSTA"}</span>
                <strong>{item.title}</strong>
                <small>@{item.author} · {formatDate(item.createdAt)}</small>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(item.type, item.id)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? "EXCLUINDO..." : "EXCLUIR"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
