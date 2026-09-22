import type { User } from "firebase/auth";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

export const TOPIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TOPIC_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type TopicImageType = (typeof TOPIC_IMAGE_TYPES)[number];

export type CreateTopicInput = {
  title: string;
  summary: string;
  content: string;
  categorySlug: string;
  categoryName: string;
  authorName: string;
  image: File;
};

export type PublishedTopic = {
  id: string;
  slug: string;
};

const imageExtensions: Record<TopicImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isTopicImageType(type: string): type is TopicImageType {
  return TOPIC_IMAGE_TYPES.includes(type as TopicImageType);
}

function createSlug(title: string, suffix: string) {
  const baseSlug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");

  return `${baseSlug || "topico"}-${suffix.toLowerCase()}`;
}

export function validateTopicImage(image: File) {
  if (!isTopicImageType(image.type)) {
    throw new Error("Use uma imagem JPG, PNG, WebP ou GIF.");
  }

  if (image.size > TOPIC_IMAGE_MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
}

export async function publishTopic(
  user: User,
  input: CreateTopicInput,
): Promise<PublishedTopic> {
  validateTopicImage(input.image);

  const temporaryRef = doc(collection(db, "topics"));
  const suffix = temporaryRef.id.slice(0, 8);
  const slug = createSlug(input.title, suffix);
  const topicRef = doc(db, "topics", slug);
  const extension = imageExtensions[input.image.type as TopicImageType];
  const imagePath = `topics/${user.uid}/${topicRef.id}/cover.${extension}`;
  const imageRef = ref(storage, imagePath);
  let imageUploaded = false;

  try {
    await uploadBytes(imageRef, input.image, {
      contentType: input.image.type,
      customMetadata: {
        ownerId: user.uid,
        topicId: topicRef.id,
      },
    });
    imageUploaded = true;

    const imageUrl = await getDownloadURL(imageRef);
    await setDoc(topicRef, {
      slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      content: input.content.trim(),
      categorySlug: input.categorySlug,
      categoryName: input.categoryName,
      authorId: user.uid,
      authorName: input.authorName,
      imageUrl,
      imagePath,
      status: "published",
      views: 0,
      repliesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: topicRef.id, slug };
  } catch (error) {
    if (imageUploaded) {
      try {
        await deleteObject(imageRef);
      } catch {
        // Preserva o erro original. Uma limpeza administrativa pode remover
        // o arquivo se a exclusão automática também for bloqueada.
      }
    }

    throw error;
  }
}
