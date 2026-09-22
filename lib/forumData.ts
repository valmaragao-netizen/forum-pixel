import {
  collection,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { withFirestoreDebug } from "@/lib/firestoreDebug";

export type VisualTone = "blue" | "pink" | "yellow" | "cyan";

export type ForumCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  seoDescription: string;
  tone: VisualTone;
  glyph: string;
  number: string;
  topicsCount: number;
  status: "active";
};

export type ForumTopic = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  categorySlug: string;
  categoryName: string;
  authorId: string;
  author: string;
  authorInitials: string;
  authorAvatarUrl: string;
  createdAt: string;
  displayDate: string;
  relativeTime: string;
  views: number;
  repliesCount: number;
  likesCount: number;
  imageUrl: string;
  imagePath: string;
  status: "published";
  tone: VisualTone;
};

export type ForumReply = {
  id: string;
  topicId: string;
  topicSlug: string;
  authorId: string;
  author: string;
  initials: string;
  authorAvatarUrl: string;
  createdAt: string;
  displayDate: string;
  content: string;
  status: "published";
};

export type ForumStats = {
  users: number;
  topics: number;
  replies: number;
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateFromValue(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function formatDate(date: Date | null, withTime = false) {
  if (!date) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "America/Cuiaba",
  }).format(date);
}

function formatRelativeDate(date: Date | null) {
  if (!date) {
    return "agora";
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));

  if (elapsedMinutes < 1) return "agora";
  if (elapsedMinutes < 60) return `há ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `há ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `há ${elapsedDays} d`;
}

function initialsFromName(name: string) {
  const initials = name
    .replace(/[^a-zA-ZÀ-ÿ0-9_ ]/g, " ")
    .split(/[ _]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "FP";
}

function isTone(value: unknown): value is VisualTone {
  return value === "blue" || value === "pink" || value === "yellow" || value === "cyan";
}

function categoryFromData(id: string, data: DocumentData): ForumCategory | null {
  if (data.status !== "active") {
    return null;
  }

  const slug = stringValue(data.slug, id);
  const name = stringValue(data.name);

  if (!slug || !name) {
    return null;
  }

  return {
    id,
    slug,
    name,
    description: stringValue(data.description),
    seoDescription: stringValue(data.seoDescription, stringValue(data.description)),
    tone: isTone(data.tone) ? data.tone : "cyan",
    glyph: stringValue(data.glyph, "#_"),
    number: stringValue(data.number, "00"),
    topicsCount: 0,
    status: "active",
  };
}

function topicFromData(id: string, data: DocumentData): ForumTopic | null {
  if (data.status !== "published") {
    return null;
  }

  const createdAt = dateFromValue(data.createdAt);
  const author = stringValue(data.authorName, "usuario");
  const categorySlug = stringValue(data.categorySlug);

  if (!stringValue(data.slug) || !stringValue(data.title) || !categorySlug) {
    return null;
  }

  return {
    id,
    slug: stringValue(data.slug),
    title: stringValue(data.title),
    summary: stringValue(data.summary),
    content: stringValue(data.content),
    categorySlug,
    categoryName: stringValue(data.categoryName, categorySlug),
    authorId: stringValue(data.authorId),
    author,
    authorInitials: initialsFromName(author),
    authorAvatarUrl: "",
    createdAt: createdAt?.toISOString() ?? new Date(0).toISOString(),
    displayDate: formatDate(createdAt),
    relativeTime: formatRelativeDate(createdAt),
    views: numberValue(data.views),
    repliesCount: numberValue(data.repliesCount),
    likesCount: numberValue(data.likesCount),
    imageUrl: stringValue(data.imageUrl),
    imagePath: stringValue(data.imagePath),
    status: "published",
    tone: "cyan",
  };
}

function replyFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ForumReply | null {
  const data = snapshot.data();

  if (data.status !== "published") {
    return null;
  }

  const createdAt = dateFromValue(data.createdAt);
  const author = stringValue(data.authorUsername, stringValue(data.authorName, "usuario"));

  return {
    id: snapshot.id,
    topicId: stringValue(data.topicId),
    topicSlug: stringValue(data.topicSlug),
    authorId: stringValue(data.authorId),
    author,
    initials: initialsFromName(author),
    authorAvatarUrl: "",
    createdAt: createdAt?.toISOString() ?? new Date(0).toISOString(),
    displayDate: formatDate(createdAt, true),
    content: stringValue(data.content),
    status: "published",
  };
}

function sortByCreatedAtDescending<T extends { createdAt: string }>(items: T[]) {
  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function getAvatarUrlsByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const avatarUrls = new Map<string, string>();

  for (let index = 0; index < uniqueUserIds.length; index += 30) {
    const userIdChunk = uniqueUserIds.slice(index, index + 30);
    const snapshot = await withFirestoreDebug(
      "users.readByIds",
      () => getDocs(
        query(collection(db, "users"), where(documentId(), "in", userIdChunk)),
      ),
      { count: userIdChunk.length },
    );

    for (const userSnapshot of snapshot.docs) {
      const avatarUrl = stringValue(userSnapshot.data().avatarUrl);

      if (avatarUrl) {
        avatarUrls.set(userSnapshot.id, avatarUrl);
      }
    }
  }

  return avatarUrls;
}

async function attachTopicAvatars(topics: ForumTopic[]) {
  const avatarUrls = await getAvatarUrlsByUserId(
    topics.map((topic) => topic.authorId),
  );

  return topics.map((topic) => ({
    ...topic,
    authorAvatarUrl: avatarUrls.get(topic.authorId) ?? "",
  }));
}

async function attachReplyAvatars(replies: ForumReply[]) {
  const avatarUrls = await getAvatarUrlsByUserId(
    replies.map((reply) => reply.authorId),
  );

  return replies.map((reply) => ({
    ...reply,
    authorAvatarUrl: avatarUrls.get(reply.authorId) ?? "",
  }));
}

export function getTopicPreview(content: string, maxLength = 110) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (normalizedContent.length <= maxLength) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, maxLength).trimEnd()}...`;
}

export async function getCategories() {
  const snapshot = await withFirestoreDebug(
    "categories.listActive",
    () => getDocs(
      query(collection(db, "categories"), where("status", "==", "active")),
    ),
  );

  return snapshot.docs
    .map((item) => categoryFromData(item.id, item.data()))
    .filter((item): item is ForumCategory => item !== null)
    .sort((left, right) => left.number.localeCompare(right.number) || left.name.localeCompare(right.name));
}

export async function getCategoryBySlug(slug: string) {
  const snapshot = await withFirestoreDebug(
    "categories.readActiveBySlug",
    () => getDocs(
      query(
        collection(db, "categories"),
        where("status", "==", "active"),
        where("slug", "==", slug),
        limit(1),
      ),
    ),
    { categorySlug: slug },
  );
  const result = snapshot.docs[0];

  return result ? categoryFromData(result.id, result.data()) : null;
}

export async function getPublishedTopics() {
  const snapshot = await withFirestoreDebug(
    "topics.listPublished",
    () => getDocs(
      query(collection(db, "topics"), where("status", "==", "published")),
    ),
  );

  const topics = sortByCreatedAtDescending(
    snapshot.docs
      .map((item) => topicFromData(item.id, item.data()))
      .filter((item): item is ForumTopic => item !== null),
  );

  return attachTopicAvatars(topics);
}

export async function getTopicBySlug(slug: string) {
  const topics = await getPublishedTopics();
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export async function getTopicsByCategory(categorySlug: string) {
  const snapshot = await withFirestoreDebug(
    "topics.listPublishedByCategory",
    () => getDocs(
      query(
        collection(db, "topics"),
        where("status", "==", "published"),
        where("categorySlug", "==", categorySlug),
      ),
    ),
    { categorySlug },
  );

  const topics = sortByCreatedAtDescending(
    snapshot.docs
      .map((item) => topicFromData(item.id, item.data()))
      .filter((item): item is ForumTopic => item !== null),
  );

  return attachTopicAvatars(topics);
}

export async function getTopicsByAuthor(authorId: string) {
  const snapshot = await withFirestoreDebug(
    "topics.listPublishedByAuthor",
    () => getDocs(
      query(
        collection(db, "topics"),
        where("status", "==", "published"),
        where("authorId", "==", authorId),
      ),
    ),
    { authorId },
  );

  const topics = sortByCreatedAtDescending(
    snapshot.docs
      .map((item) => topicFromData(item.id, item.data()))
      .filter((item): item is ForumTopic => item !== null),
  );

  return attachTopicAvatars(topics);
}

export async function getRepliesByTopic(topicId: string) {
  const snapshot = await withFirestoreDebug(
    "replies.listPublishedByTopic",
    () => getDocs(
      query(
        collection(db, "replies"),
        where("status", "==", "published"),
        where("topicId", "==", topicId),
      ),
    ),
    { topicId },
  );

  const replies = snapshot.docs
    .map(replyFromSnapshot)
    .filter((item): item is ForumReply => item !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return attachReplyAvatars(replies);
}

export async function getForumStats(): Promise<ForumStats> {
  const [users, topics, replies] = await Promise.all([
    withFirestoreDebug(
      "users.count",
      () => getCountFromServer(collection(db, "users")),
    ),
    withFirestoreDebug(
      "topics.countPublished",
      () => getCountFromServer(query(collection(db, "topics"), where("status", "==", "published"))),
    ),
    withFirestoreDebug(
      "replies.countPublished",
      () => getCountFromServer(query(collection(db, "replies"), where("status", "==", "published"))),
    ),
  ]);

  return {
    users: users.data().count,
    topics: topics.data().count,
    replies: replies.data().count,
  };
}

export function applyCategoryData(
  categories: ForumCategory[],
  topics: ForumTopic[],
) {
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const counts = new Map<string, number>();

  for (const topic of topics) {
    counts.set(topic.categorySlug, (counts.get(topic.categorySlug) ?? 0) + 1);
    const category = categoryBySlug.get(topic.categorySlug);

    if (category) {
      topic.tone = category.tone;
      topic.categoryName = category.name;
    }
  }

  return categories.map((category) => ({
    ...category,
    topicsCount: counts.get(category.slug) ?? 0,
  }));
}
