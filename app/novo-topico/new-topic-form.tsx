"use client";

import { FirebaseError } from "firebase/app";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  createCategoryCoverFile,
  getCategoryCoverUrl,
} from "@/lib/categoryCovers";
import { installDefaultCategories } from "@/lib/firestoreCategories";
import {
  TOPIC_IMAGE_MAX_BYTES,
  TOPIC_IMAGE_TYPES,
  publishTopic,
  validateTopicImage,
} from "@/lib/firestoreTopics";
import { getCategories, type ForumCategory } from "@/lib/forumData";

const TITLE_LIMIT = 90;
const SUMMARY_LIMIT = 220;

function getPublishErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied" || error.code === "storage/unauthorized") {
      return "O Firebase bloqueou a publicação. Confira e publique as regras do Firestore e do Storage.";
    }

    if (error.code === "storage/quota-exceeded") {
      return "A cota do Firebase Storage foi excedida.";
    }

    return `Erro do Firebase: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Não foi possível publicar o tópico.";
}

export function NewTopicForm() {
  const router = useRouter();
  const { user, profile, isModerator } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categorySlug, setCategorySlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imagePreviewRef = useRef("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        let result = await getCategories();

        if (result.length === 0 && user && isModerator) {
          try {
            const installedCount = await installDefaultCategories(user.uid);
            result = await getCategories();

            if (active && installedCount > 0) {
              setNotice("Categorias padrão configuradas no Firestore.");
            }
          } catch (installError) {
            // Outra aba pode ter concluído a instalação entre a leitura e a gravação.
            result = await getCategories();

            if (result.length === 0) {
              throw installError;
            }
          }
        }

        if (active) {
          setCategories(result);
        }
      } catch (caughtError) {
        if (active) {
          setError(getPublishErrorMessage(caughtError));
        }
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => {
      active = false;

      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, [isModerator, user]);

  function clearImagePreview() {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
      imagePreviewRef.current = "";
    }

    setImagePreview("");
  }

  function handleImageChange(file: File | null) {
    setError("");
    setNotice("");

    if (!file) {
      clearImagePreview();
      setImage(null);
      return;
    }

    try {
      validateTopicImage(file);
      clearImagePreview();
      const objectUrl = URL.createObjectURL(file);
      imagePreviewRef.current = objectUrl;
      setImagePreview(objectUrl);
      setImage(file);
    } catch (caughtError) {
      clearImagePreview();
      setImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setError(getPublishErrorMessage(caughtError));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");

    if (!user) {
      setError("Sua sessão expirou. Entre novamente antes de publicar.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const category = categories.find((item) => item.slug === categorySlug);

    if (!category) {
      setError("Selecione uma categoria válida.");
      return;
    }

    setPublishing(true);

    try {
      const topicImage = image ?? await createCategoryCoverFile(category.slug);

      const result = await publishTopic(user, {
        title,
        summary,
        content: String(formData.get("content") ?? ""),
        categorySlug: category.slug,
        categoryName: category.name,
        authorName:
          profile?.displayName ||
          user.displayName?.trim() ||
          user.email?.split("@")[0] ||
          "usuario",
        image: topicImage,
      });

      form.reset();
      setTitle("");
      setSummary("");
      setCategorySlug("");
      setImage(null);
      clearImagePreview();
      setNotice("Tópico publicado. Abrindo a conversa...");
      router.push(`/topico/${result.slug}`);
      router.refresh();
    } catch (caughtError) {
      setError(getPublishErrorMessage(caughtError));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <form className="new-topic-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <div className="form-label-row">
          <label htmlFor="topic-title">TÍTULO DO TÓPICO</label>
          <span aria-live="polite">{title.length}/{TITLE_LIMIT}</span>
        </div>
        <input
          id="topic-title"
          name="title"
          type="text"
          minLength={8}
          maxLength={TITLE_LIMIT}
          placeholder="Ex.: qual upgrade vale mais a pena agora?"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setNotice("");
          }}
          disabled={publishing}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="topic-category">CATEGORIA</label>
        <div className="select-frame">
          <select
            id="topic-category"
            name="category"
            value={categorySlug}
            onChange={(event) => {
              setCategorySlug(event.target.value);
              clearImagePreview();
              setImage(null);
              if (imageInputRef.current) {
                imageInputRef.current.value = "";
              }
              setError("");
              setNotice("");
            }}
            disabled={publishing || loadingCategories || categories.length === 0}
            required
          >
            <option value="" disabled>
              {loadingCategories
                ? "Carregando categorias..."
                : categories.length === 0
                  ? "Nenhuma categoria disponível"
                  : "Selecione uma categoria"}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>{category.name}</option>
            ))}
          </select>
          <span aria-hidden="true">▼</span>
        </div>
      </div>

      <div className="form-field">
        <div className="form-label-row">
          <label htmlFor="topic-summary">BREVE DESCRIÇÃO</label>
          <span aria-live="polite">{summary.length}/{SUMMARY_LIMIT}</span>
        </div>
        <textarea
          className="topic-summary-input"
          id="topic-summary"
          name="summary"
          rows={4}
          minLength={20}
          maxLength={SUMMARY_LIMIT}
          placeholder="Resuma o assunto para aparecer nas listas do fórum..."
          value={summary}
          onChange={(event) => {
            setSummary(event.target.value);
            setNotice("");
          }}
          disabled={publishing}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="topic-image">IMAGEM DE CAPA</label>
        <p className="topic-image-helper">
          {categorySlug
            ? "A capa padrão da categoria já está selecionada. Você pode substituí-la por uma imagem local."
            : "Escolha uma categoria para carregar a capa padrão ou selecione uma imagem local."}
        </p>
        <label className="topic-image-picker" htmlFor="topic-image">
          <input
            id="topic-image"
            ref={imageInputRef}
            name="image"
            type="file"
            accept={TOPIC_IMAGE_TYPES.join(",")}
            onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
            disabled={publishing}
          />
          {imagePreview || categorySlug ? (
            <span className="topic-image-preview">
              <Image
                src={imagePreview || getCategoryCoverUrl(categorySlug)}
                alt={imagePreview ? "Prévia da imagem local do tópico" : `Capa padrão da categoria ${categories.find((category) => category.slug === categorySlug)?.name ?? "selecionada"}`}
                fill
                unoptimized
                sizes="(max-width: 720px) 100vw, 680px"
              />
              <b>{imagePreview ? "CAPA LOCAL · TROCAR" : "CAPA PADRÃO · ESCOLHER OUTRA"}</b>
            </span>
          ) : (
            <span className="topic-image-empty">
              <b>[ + ] ESCOLHA UMA CATEGORIA OU IMAGEM</b>
              <small>IMAGEM LOCAL: JPG, PNG, WEBP OU GIF · MÁXIMO {TOPIC_IMAGE_MAX_BYTES / 1024 / 1024} MB</small>
            </span>
          )}
        </label>
      </div>

      <div className="form-field">
        <div className="form-label-row">
          <label htmlFor="topic-content">CONTEÚDO DA POSTAGEM</label>
          <span>CONTEXTO É IMPORTANTE</span>
        </div>
        <textarea
          id="topic-content"
          name="content"
          rows={13}
          minLength={40}
          maxLength={12000}
          placeholder="Escreva como em um fórum: explique a situação, o que você já pesquisou e qual discussão quer iniciar..."
          disabled={publishing}
          required
        />
      </div>

      <div className="publish-row">
        <div className="publish-status" aria-live="polite">
          {error ? (
            <p className="publish-error"><span>!</span> {error}</p>
          ) : notice ? (
            <p className="publish-success"><span>✓</span> {notice}</p>
          ) : publishing ? (
            <p><span>&gt;</span> enviando imagem e salvando tópico...</p>
          ) : (
            <p><span>&gt;</span> pronto para publicar no Firebase</p>
          )}
        </div>
        <button className="publish-button" type="submit" disabled={publishing || loadingCategories || categories.length === 0}>
          {publishing ? "PUBLICANDO..." : "PUBLICAR TÓPICO"} <span>↵</span>
        </button>
      </div>
    </form>
  );
}
