import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  addDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  logFirestoreError,
  withFirestoreDebug,
} from "@/lib/firestoreDebug";

export type InboxMessage = {
  id: string;
  senderUsername: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  replyId: string;
  excerpt: string;
  read: boolean;
  createdAt: string;
  displayDate: string;
};

export type DirectoryUser = {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  body: string;
  read: boolean;
  createdAt: string;
  displayDate: string;
};

function messageFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): InboxMessage {
  const data = snapshot.data();
  const timestamp = data.createdAt as Timestamp | undefined;
  const date = timestamp && typeof timestamp.toDate === "function"
    ? timestamp.toDate()
    : null;

  return {
    id: snapshot.id,
    senderUsername: typeof data.senderUsername === "string" ? data.senderUsername : "usuario",
    topicId: typeof data.topicId === "string" ? data.topicId : "",
    topicSlug: typeof data.topicSlug === "string" ? data.topicSlug : "",
    topicTitle: typeof data.topicTitle === "string" ? data.topicTitle : "Tópico",
    replyId: typeof data.replyId === "string" ? data.replyId : "",
    excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
    read: data.read === true,
    createdAt: date?.toISOString() ?? new Date(0).toISOString(),
    displayDate: date
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Cuiaba",
        }).format(date)
      : "agora",
  };
}

export async function getInboxMessages(userId: string) {
  const snapshot = await withFirestoreDebug(
    "inbox.listByRecipient",
    () => getDocs(
      query(collection(db, "inbox"), where("recipientId", "==", userId)),
    ),
    { userId },
  );

  return snapshot.docs
    .map(messageFromSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function markInboxMessageRead(messageId: string) {
  await withFirestoreDebug(
    "inbox.markRead",
    () => updateDoc(doc(db, "inbox", messageId), {
      read: true,
      readAt: serverTimestamp(),
    }),
    { messageId },
  );
}

function directMessageFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DirectMessage {
  const data = snapshot.data();
  const timestamp = data.createdAt as Timestamp | undefined;
  const date = timestamp && typeof timestamp.toDate === "function"
    ? timestamp.toDate()
    : null;

  return {
    id: snapshot.id,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    senderUsername: typeof data.senderUsername === "string" ? data.senderUsername : "usuario",
    recipientId: typeof data.recipientId === "string" ? data.recipientId : "",
    recipientUsername: typeof data.recipientUsername === "string" ? data.recipientUsername : "usuario",
    body: typeof data.body === "string" ? data.body : "",
    read: data.read === true,
    createdAt: date?.toISOString() ?? new Date(0).toISOString(),
    displayDate: date
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Cuiaba",
        }).format(date)
      : "agora",
  };
}

export async function getUserDirectory(currentUserId: string) {
  const snapshot = await withFirestoreDebug(
    "users.listDirectory",
    () => getDocs(collection(db, "users")),
    { currentUserId },
  );

  return snapshot.docs
    .filter((item) => item.id !== currentUserId)
    .map((item): DirectoryUser => {
      const data = item.data();

      return {
        uid: item.id,
        displayName: typeof data.displayName === "string" ? data.displayName : "usuario",
        avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
        bio: typeof data.bio === "string" ? data.bio : "",
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-BR"));
}

export function subscribeDirectMessages(
  userId: string,
  onMessages: (messages: DirectMessage[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, "messages"), where("participantIds", "array-contains", userId)),
    (snapshot) => {
      onMessages(
        snapshot.docs
          .map(directMessageFromSnapshot)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      );
    },
    (error) => {
      logFirestoreError("messages.subscribe", error, { userId });
      onError(error);
    },
  );
}

export async function sendDirectMessage({
  senderId,
  senderUsername,
  recipient,
  body,
}: {
  senderId: string;
  senderUsername: string;
  recipient: DirectoryUser;
  body: string;
}) {
  const normalizedBody = body.trim();

  if (normalizedBody.length < 1 || normalizedBody.length > 2000) {
    throw new Error("A mensagem deve ter entre 1 e 2.000 caracteres.");
  }

  await withFirestoreDebug(
    "messages.create",
    () => addDoc(collection(db, "messages"), {
      participantIds: [senderId, recipient.uid],
      senderId,
      senderUsername,
      recipientId: recipient.uid,
      recipientUsername: recipient.displayName,
      body: normalizedBody,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { senderId, recipientId: recipient.uid },
  );
}

export async function markDirectMessageRead(messageId: string) {
  await withFirestoreDebug(
    "messages.markRead",
    () => updateDoc(doc(db, "messages", messageId), {
      read: true,
      readAt: serverTimestamp(),
    }),
    { messageId },
  );
}
