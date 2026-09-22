import type { User } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { withFirestoreDebug } from "@/lib/firestoreDebug";

export async function publishReply({
  user,
  authorUsername,
  topicId,
  topicSlug,
  topicTitle,
  topicAuthorId,
  content,
}: {
  user: User;
  authorUsername: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  topicAuthorId: string;
  content: string;
}) {
  const normalizedContent = content.trim();

  if (normalizedContent.length < 2 || normalizedContent.length > 8000) {
    throw new Error("A resposta deve ter entre 2 e 8.000 caracteres.");
  }

  const replyRef = doc(collection(db, "replies"));
  const topicRef = doc(db, "topics", topicId);
  const batch = writeBatch(db);

  batch.set(replyRef, {
    topicId,
    topicSlug,
    authorId: user.uid,
    authorUsername,
    content: normalizedContent,
    likesCount: 0,
    status: "published",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(topicRef, {
    repliesCount: increment(1),
    lastReplyId: replyRef.id,
    lastReplyAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (topicAuthorId && topicAuthorId !== user.uid) {
    const inboxRef = doc(collection(db, "inbox"));
    batch.set(inboxRef, {
      recipientId: topicAuthorId,
      senderId: user.uid,
      senderUsername: authorUsername,
      type: "reply",
      topicId,
      topicSlug,
      topicTitle,
      replyId: replyRef.id,
      excerpt: normalizedContent.slice(0, 180),
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  await withFirestoreDebug(
    "replies.createAndIncrementTopic",
    () => batch.commit(),
    { replyId: replyRef.id, topicId },
  );
  return replyRef.id;
}
