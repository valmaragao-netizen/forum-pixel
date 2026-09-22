import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  doc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { withFirestoreDebug } from "@/lib/firestoreDebug";

export type ModerationTargetType = "topic" | "reply";

export type ModerationItem = {
  id: string;
  type: ModerationTargetType;
  title: string;
  author: string;
  status: string;
  createdAt: Date | null;
};

function getDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate();
  }

  return null;
}

function topicFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ModerationItem {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: "topic",
    title: typeof data.title === "string" ? data.title : "Tópico sem título",
    author:
      typeof data.authorName === "string"
        ? data.authorName
        : typeof data.authorUsername === "string"
          ? data.authorUsername
          : "usuário desconhecido",
    status: typeof data.status === "string" ? data.status : "unknown",
    createdAt: getDate(data.createdAt),
  };
}

function replyFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ModerationItem {
  const data = snapshot.data();
  const content = typeof data.content === "string" ? data.content : "Resposta sem conteúdo";

  return {
    id: snapshot.id,
    type: "reply",
    title: content.length > 100 ? `${content.slice(0, 100)}...` : content,
    author:
      typeof data.authorName === "string"
        ? data.authorName
        : typeof data.authorUsername === "string"
          ? data.authorUsername
          : "usuário desconhecido",
    status: typeof data.status === "string" ? data.status : "unknown",
    createdAt: getDate(data.createdAt),
  };
}

export async function getModerationItems() {
  const [topicsSnapshot, repliesSnapshot] = await withFirestoreDebug(
    "moderation.listContent",
    () => Promise.all([
      getDocs(query(collection(db, "topics"), orderBy("createdAt", "desc"), limit(50))),
      getDocs(query(collection(db, "replies"), orderBy("createdAt", "desc"), limit(50))),
    ]),
  );

  return {
    topics: topicsSnapshot.docs.map(topicFromSnapshot),
    replies: repliesSnapshot.docs.map(replyFromSnapshot),
  };
}

export async function softDeleteContent(
  type: ModerationTargetType,
  id: string,
  moderatorId: string,
) {
  const collectionName = type === "topic" ? "topics" : "replies";

  if (type === "reply") {
    const replyRef = doc(db, collectionName, id);

    await withFirestoreDebug("moderation.softDeleteReply", () => runTransaction(db, async (transaction) => {
      const replySnapshot = await transaction.get(replyRef);

      if (!replySnapshot.exists()) {
        throw new Error("A resposta não existe mais.");
      }

      const topicId = replySnapshot.data().topicId;
      const topicRef = typeof topicId === "string" && topicId
        ? doc(db, "topics", topicId)
        : null;
      const topicSnapshot = topicRef ? await transaction.get(topicRef) : null;

      transaction.update(replyRef, {
        status: "deleted",
        deletedAt: serverTimestamp(),
        deletedBy: moderatorId,
        updatedAt: serverTimestamp(),
      });

      if (topicRef && topicSnapshot?.exists()) {
        const repliesCount = topicSnapshot.data().repliesCount;

        if (typeof repliesCount === "number" && repliesCount > 0) {
          transaction.update(topicRef, {
            repliesCount: repliesCount - 1,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }), { replyId: id, moderatorId });

    return;
  }

  await withFirestoreDebug(
    "moderation.softDeleteTopic",
    () => updateDoc(doc(db, collectionName, id), {
      status: "deleted",
      deletedAt: serverTimestamp(),
      deletedBy: moderatorId,
      updatedAt: serverTimestamp(),
    }),
    { topicId: id, moderatorId },
  );
}
