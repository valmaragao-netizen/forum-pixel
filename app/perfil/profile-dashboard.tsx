"use client";

import { FirebaseError } from "firebase/app";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { AuthRequiredPanel } from "@/app/components/auth-required-panel";
import { useAuth, type UserProfile } from "@/app/providers/auth-provider";
import {
  getInboxMessages,
  getUserDirectory,
  markDirectMessageRead,
  markInboxMessageRead,
  sendDirectMessage,
  subscribeDirectMessages,
  type DirectMessage,
  type DirectoryUser,
  type InboxMessage,
} from "@/lib/firestoreInbox";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  PROFILE_AVATARS,
  deleteOwnTopic,
  updateForumProfile,
  validateAvatar,
} from "@/lib/firestoreProfile";
import { getTopicsByAuthor, type ForumTopic } from "@/lib/forumData";

function firebaseMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied" || error.code === "storage/unauthorized") {
      return "O Firebase bloqueou a operação. Publique as regras atualizadas do Firestore e Storage.";
    }

    return `Erro do Firebase: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function avatarStyle(url: string) {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

export function ProfileDashboard() {
  const { user, profile, isModerator, loading: authLoading } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void Promise.all([
      getTopicsByAuthor(user.uid),
      getInboxMessages(user.uid),
    ])
      .then(([nextTopics, nextMessages]) => {
        if (active) {
          setTopics(nextTopics);
          setMessages(nextMessages);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(firebaseMessage(caughtError));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingData(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function handleDelete(topic: ForumTopic) {
    if (!user || !window.confirm(`Excluir "${topic.title}" da área pública?`)) {
      return;
    }

    setDeletingId(topic.id);
    setError("");

    try {
      await deleteOwnTopic(user.uid, topic.id);
      setTopics((current) => current.filter((item) => item.id !== topic.id));
    } catch (caughtError) {
      setError(firebaseMessage(caughtError));
    } finally {
      setDeletingId("");
    }
  }

  async function handleOpenMessage(message: InboxMessage) {
    if (message.read) {
      return;
    }

    setMessages((current) => current.map((item) => (
      item.id === message.id ? { ...item, read: true } : item
    )));

    try {
      await markInboxMessageRead(message.id);
    } catch (caughtError) {
      setError(firebaseMessage(caughtError));
    }
  }

  if (authLoading) {
    return <main className="profile-main"><div className="auth-loading-panel auth-loading-panel-large"><span>&gt;</span> carregando perfil<i>_</i></div></main>;
  }

  if (!user || !profile) {
    return (
      <main className="profile-main">
        <AuthRequiredPanel
          message="Entre para acessar seu perfil."
          detail="Suas publicações, configurações e mensagens ficam disponíveis depois do login."
        />
      </main>
    );
  }

  const unreadCount = messages.filter((message) => !message.read).length;
  const repliesCount = topics.reduce((total, topic) => total + topic.repliesCount, 0);

  return (
    <main className="profile-main">
      <nav className="breadcrumb" aria-label="Navegação estrutural">
        <Link href="/">Início</Link><span aria-hidden="true">&gt;</span><span aria-current="page">Meu perfil</span>
      </nav>

      <section className="profile-hero">
        <span className={`profile-avatar ${profile.avatarUrl ? "has-image" : ""}`} style={avatarStyle(profile.avatarUrl)} aria-hidden="true">
          {!profile.avatarUrl && profile.displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="profile-identity">
          <p className="eyebrow">/ IDENTIDADE_DIGITAL</p>
          <h1>@{profile.displayName}<span>_</span></h1>
          <p>{profile.bio || "Este usuário ainda não escreveu uma biografia."}</p>
          <div className="profile-badges">
            <span>{isModerator ? "MODERADOR" : "MEMBRO"}</span>
            <span>{user.email}</span>
          </div>
        </div>
        <dl className="profile-stats">
          <div><dt>POSTAGENS</dt><dd>{topics.length}</dd></div>
          <div><dt>RESPOSTAS</dt><dd>{repliesCount}</dd></div>
          <div><dt>NÃO LIDAS</dt><dd>{unreadCount}</dd></div>
        </dl>
      </section>

      <nav className="profile-nav" aria-label="Seções do perfil">
        <a href="#minhas-postagens">POSTAGENS</a>
        <a href="#editar-perfil">EDITAR PERFIL</a>
        <a href="#caixa-de-entrada">CAIXA DE ENTRADA <b>{unreadCount}</b></a>
      </nav>

      {error && <p className="auth-form-error profile-global-error" role="alert"><span>!</span> {error}</p>}

      <div className="profile-layout">
        <section id="minhas-postagens" className="profile-panel profile-posts-panel">
          <header>
            <div><p className="eyebrow">/ CONTEÚDO PUBLICADO</p><h2>MINHAS POSTAGENS</h2></div>
            <span>{topics.length.toString().padStart(2, "0")} TÓPICOS</span>
          </header>

          {loadingData ? (
            <div className="auth-loading-panel"><span>&gt;</span> consultando Firestore<i>_</i></div>
          ) : topics.length > 0 ? (
            <div className="profile-topic-list">
              {topics.map((topic) => (
                <article className="profile-topic" key={topic.id}>
                  <div>
                    <span>{topic.categoryName} · {topic.displayDate}</span>
                    <Link href={`/topico/${topic.slug}`}>{topic.title}</Link>
                    <small>{topic.repliesCount} respostas · {topic.views} visualizações</small>
                  </div>
                  <button type="button" onClick={() => void handleDelete(topic)} disabled={deletingId === topic.id}>
                    {deletingId === topic.id ? "EXCLUINDO..." : "EXCLUIR"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty"><span>&gt;_</span><p>Você ainda não publicou nenhum tópico.</p><Link href="/novo-topico">+ CRIAR PRIMEIRO TÓPICO</Link></div>
          )}
        </section>

        <aside className="profile-side-column">
          <ProfileEditor profile={profile} />
          <section id="caixa-de-entrada" className="profile-panel inbox-panel">
            <header>
              <div><p className="eyebrow">/ NOTIFICAÇÕES</p><h2>CAIXA DE ENTRADA</h2></div>
              <span>{unreadCount.toString().padStart(2, "0")} NOVAS</span>
            </header>

            <DirectMessages />

            <div className="inbox-subheading">
              <span>/ ATIVIDADE_DO_FÓRUM</span>
              <b>{unreadCount} NÃO LIDAS</b>
            </div>

            {loadingData ? (
              <div className="auth-loading-panel"><span>&gt;</span> buscando mensagens<i>_</i></div>
            ) : messages.length > 0 ? (
              <div className="inbox-list">
                {messages.map((message) => (
                  <Link
                    className={`inbox-message ${message.read ? "is-read" : "is-unread"}`}
                    href={`/topico/${message.topicSlug}#resposta-${message.replyId}`}
                    key={message.id}
                    onClick={() => void handleOpenMessage(message)}
                  >
                    <span className="inbox-status" aria-hidden="true">{message.read ? "○" : "●"}</span>
                    <span>
                      <strong>@{message.senderUsername} respondeu ao seu tópico</strong>
                      <b>{message.topicTitle}</b>
                      <small>{message.excerpt}</small>
                      <time dateTime={message.createdAt}>{message.displayDate}</time>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="profile-empty"><span>&gt;_</span><p>Sua caixa de entrada está vazia.</p></div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function DirectMessages() {
  const { user, profile } = useAuth();
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void getUserDirectory(user.uid)
      .then((users) => {
        if (active) {
          setDirectory(users);
          setSelectedUserId((current) => current || users[0]?.uid || "");
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(firebaseMessage(caughtError));
        }
      });

    const unsubscribe = subscribeDirectMessages(
      user.uid,
      (nextMessages) => {
        if (!active) {
          return;
        }

        setMessages(nextMessages);
        setLoading(false);
        const latest = nextMessages.at(-1);
        const peerId = latest
          ? latest.senderId === user.uid
            ? latest.recipientId
            : latest.senderId
          : "";
        setSelectedUserId((current) => current || peerId);
      },
      (caughtError) => {
        if (active) {
          setError(firebaseMessage(caughtError));
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUserId) {
      return;
    }

    const unreadMessages = messages.filter((message) => (
      message.senderId === selectedUserId &&
      message.recipientId === user.uid &&
      !message.read
    ));

    for (const message of unreadMessages) {
      void markDirectMessageRead(message.id).catch((caughtError) => {
        setError(firebaseMessage(caughtError));
      });
    }
  }, [messages, selectedUserId, user]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !profile) {
      return;
    }

    const recipient = directory.find((item) => item.uid === selectedUserId);

    if (!recipient) {
      setError("Selecione um usuário para iniciar a conversa.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await sendDirectMessage({
        senderId: user.uid,
        senderUsername: profile.displayName,
        recipient,
        body: draft,
      });
      setDraft("");
    } catch (caughtError) {
      setError(firebaseMessage(caughtError));
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return null;
  }

  const selectedUser = directory.find((item) => item.uid === selectedUserId) ?? null;
  const conversation = messages.filter((message) => (
    message.senderId === selectedUserId || message.recipientId === selectedUserId
  ));
  const unreadDirectCount = messages.filter((message) => message.recipientId === user.uid && !message.read).length;

  return (
    <div className="direct-messages">
      <div className="inbox-subheading direct-heading">
        <span>/ MENSAGENS_PRIVADAS</span>
        <b>{unreadDirectCount} NÃO LIDAS</b>
      </div>

      {directory.length > 0 ? (
        <>
          <div className="direct-recipient">
            <label htmlFor="direct-recipient">CONVERSAR COM</label>
            <div className="select-frame">
              <select
                id="direct-recipient"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {directory.map((directoryUser) => (
                  <option value={directoryUser.uid} key={directoryUser.uid}>
                    @{directoryUser.displayName}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">▼</span>
            </div>
          </div>

          <div className="direct-thread" aria-live="polite">
            {loading ? (
              <div className="auth-loading-panel"><span>&gt;</span> sincronizando conversa<i>_</i></div>
            ) : conversation.length > 0 ? (
              conversation.map((message) => {
                const ownMessage = message.senderId === user.uid;

                return (
                  <article className={`direct-bubble ${ownMessage ? "is-own" : "is-peer"}`} key={message.id}>
                    <span>{ownMessage ? "VOCÊ" : `@${message.senderUsername}`}</span>
                    <p>{message.body}</p>
                    <time dateTime={message.createdAt}>{message.displayDate}</time>
                  </article>
                );
              })
            ) : (
              <div className="direct-empty"><span>&gt;_</span><p>Comece uma conversa com {selectedUser ? `@${selectedUser.displayName}` : "outro usuário"}.</p></div>
            )}
          </div>

          <form className="direct-compose" onSubmit={handleSend}>
            <label className="sr-only" htmlFor="direct-message">Mensagem privada</label>
            <textarea
              id="direct-message"
              rows={3}
              minLength={1}
              maxLength={2000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreva uma mensagem privada..."
              disabled={sending}
              required
            />
            {error && <p className="auth-form-error" role="alert"><span>!</span> {error}</p>}
            <button className="forum-button forum-button-primary" type="submit" disabled={sending || !draft.trim()}>
              {sending ? "ENVIANDO..." : "ENVIAR MENSAGEM ↵"}
            </button>
          </form>
        </>
      ) : (
        <div className="profile-empty"><span>&gt;_</span><p>Nenhum outro usuário disponível para conversar.</p>{error && <small>{error}</small>}</div>
      )}
    </div>
  );
}

function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
  }, []);

  function handleAvatar(file: File | null) {
    setError("");
    setMessage("");

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    }

    if (!file) {
      setAvatar(null);
      setPreview("");
      return;
    }

    try {
      validateAvatar(file);
      const objectUrl = URL.createObjectURL(file);
      previewRef.current = objectUrl;
      setAvatar(file);
      setSelectedPreset("");
      setPreview(objectUrl);
    } catch (caughtError) {
      setAvatar(null);
      setPreview("");
      setError(firebaseMessage(caughtError));
    }
  }

  function handlePresetAvatar(src: string) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    }

    setAvatar(null);
    setSelectedPreset(src);
    setPreview(src);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      await updateForumProfile({
        user,
        bio: String(formData.get("bio") ?? ""),
        currentAvatarUrl: profile.avatarUrl,
        avatar,
        presetAvatarSrc: selectedPreset || undefined,
      });
      setMessage("Perfil atualizado com sucesso.");
      setAvatar(null);
      setSelectedPreset("");
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = "";
      }
      setPreview("");
    } catch (caughtError) {
      setError(firebaseMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  const displayedAvatar = preview || profile.avatarUrl;

  return (
    <section id="editar-perfil" className="profile-panel profile-editor">
      <header><div><p className="eyebrow">/ CONFIGURAÇÕES</p><h2>EDITAR PERFIL</h2></div><span>UID SEGURO</span></header>
      <form onSubmit={handleSubmit}>
        <fieldset className="preset-avatar-fieldset">
          <legend>ESCOLHA UM AVATAR DO FÓRUM</legend>
          <div className="preset-avatar-grid">
            {PROFILE_AVATARS.map((option) => (
              <button
                className={selectedPreset === option.src ? "is-selected" : ""}
                type="button"
                onClick={() => handlePresetAvatar(option.src)}
                aria-pressed={selectedPreset === option.src}
                key={option.id}
                disabled={saving}
              >
                <span style={avatarStyle(option.src)} aria-hidden="true" />
                <b>{option.label}</b>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="profile-avatar-picker" htmlFor="profile-avatar-input">
          <span className={`profile-avatar profile-avatar-small ${displayedAvatar ? "has-image" : ""}`} style={avatarStyle(displayedAvatar)}>
            {!displayedAvatar && profile.displayName.slice(0, 2).toUpperCase()}
          </span>
          <span><b>TROCAR FOTO</b><small>JPG, PNG OU WEBP · ATÉ {AVATAR_MAX_BYTES / 1024 / 1024} MB</small></span>
          <input id="profile-avatar-input" type="file" accept={AVATAR_TYPES.join(",")} onChange={(event) => handleAvatar(event.target.files?.[0] ?? null)} disabled={saving} />
        </label>

        <div className="form-field">
          <label htmlFor="profile-username">NOME DE USUÁRIO</label>
          <input id="profile-username" value={profile.displayName} readOnly />
          <small className="form-hint">O nome permanece bloqueado para manter a unicidade.</small>
        </div>

        <div className="form-field">
          <label htmlFor="profile-bio">BIOGRAFIA</label>
          <textarea id="profile-bio" name="bio" rows={5} maxLength={500} defaultValue={profile.bio} placeholder="Conte um pouco sobre você..." disabled={saving} />
        </div>

        {(error || message) && <p className={error ? "auth-form-error" : "profile-form-success"} role={error ? "alert" : "status"}><span>{error ? "!" : "✓"}</span> {error || message}</p>}
        <button className="forum-button forum-button-primary profile-save-button" type="submit" disabled={saving}>{saving ? "SALVANDO..." : "SALVAR PERFIL"}</button>
      </form>
    </section>
  );
}
