"use client";

import { FirebaseError } from "firebase/app";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AuthRequiredPanel } from "@/app/components/auth-required-panel";
import { useAuth } from "@/app/providers/auth-provider";
import { publishReply } from "@/lib/firestoreReplies";

export function ReplyShortcut() {
  const { user, loading } = useAuth();

  if (loading) {
    return <span className="reply-shortcut reply-shortcut-loading">↳ VERIFICANDO...</span>;
  }

  return user ? (
    <a className="reply-shortcut" href="#responder">↳ RESPONDER</a>
  ) : (
    <Link className="reply-shortcut" href="/entrar">↳ ENTRAR PARA RESPONDER</Link>
  );
}

export function TopicReplyBox({
  topicId,
  topicSlug,
  topicTitle,
  topicAuthorId,
}: {
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  topicAuthorId: string;
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!user) {
      setError("Sua sessão expirou. Entre novamente para responder.");
      return;
    }

    setSubmitting(true);

    try {
      await publishReply({
        user,
        authorUsername:
          profile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "usuario",
        topicId,
        topicSlug,
        topicTitle,
        topicAuthorId,
        content,
      });
      setContent("");
      setNotice("Resposta publicada com sucesso.");
      router.refresh();
    } catch (caughtError) {
      if (caughtError instanceof FirebaseError && caughtError.code === "permission-denied") {
        setError("O Firestore bloqueou a resposta. Publique as regras atualizadas.");
      } else {
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível publicar a resposta.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="responder" className="reply-box" aria-labelledby="reply-box-title">
      <div className="reply-box-title">
        <div>
          <p className="eyebrow">/ SUA VEZ</p>
          <h2 id="reply-box-title">ENTRE NA CONVERSA</h2>
        </div>
        <span>MARKDOWN: OFF</span>
      </div>

      {loading ? (
        <div className="auth-loading-panel" role="status">
          <span>&gt;</span> verificando sessão<i>_</i>
        </div>
      ) : user ? (
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="reply-text">Escreva sua resposta</label>
          <textarea
            id="reply-text"
            name="reply"
            placeholder="Escreva sua resposta..."
            rows={7}
            minLength={2}
            maxLength={8000}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setError("");
              setNotice("");
            }}
            disabled={submitting}
            required
          />
          {(error || notice) && (
            <p className={error ? "reply-form-message reply-form-error" : "reply-form-message reply-form-success"} role={error ? "alert" : "status"}>
              <span>{error ? "!" : "✓"}</span> {error || notice}
            </p>
          )}
          <div className="reply-actions">
            <p><span>&gt;</span> seja firme com a ideia, gentil com a pessoa</p>
            <button className="forum-button forum-button-primary" type="submit" disabled={submitting}>
              {submitting ? "ENVIANDO..." : "RESPONDER ↵"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <label className="sr-only" htmlFor="reply-text-visitor">Escreva sua resposta</label>
          <textarea
            id="reply-text-visitor"
            placeholder="Escreva sua resposta..."
            rows={5}
            disabled
          />
          <AuthRequiredPanel
            message="Faça login para participar desta discussão."
            detail="O tópico e todas as respostas continuam disponíveis para leitura."
          />
        </>
      )}
    </section>
  );
}
