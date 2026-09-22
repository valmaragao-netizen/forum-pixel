import type { User } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,32}$/;

export class UsernameUnavailableError extends Error {
  constructor() {
    super("Este nome de usuário já está em uso.");
    this.name = "UsernameUnavailableError";
  }
}

export class InvalidUsernameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUsernameError";
  }
}

export function normalizeUsername(username: string) {
  return username.normalize("NFKC").trim().toLowerCase();
}

export function validateUsername(username: string) {
  const trimmedUsername = username.trim();

  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    throw new InvalidUsernameError(
      "Use de 2 a 32 caracteres: apenas letras, números e underscore (_).",
    );
  }

  return {
    displayName: trimmedUsername,
    normalizedUsername: normalizeUsername(trimmedUsername),
  };
}

export async function reserveUsername(user: User, username: string) {
  const { displayName, normalizedUsername } = validateUsername(username);
  const usernameRef = doc(db, "usernames", normalizedUsername);
  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);

    if (usernameSnapshot.exists()) {
      throw new UsernameUnavailableError();
    }

    transaction.set(usernameRef, {
      uid: user.uid,
      displayName,
      normalizedUsername,
      createdAt: serverTimestamp(),
    });

    transaction.set(userRef, {
      uid: user.uid,
      displayName,
      usernameNormalized: normalizedUsername,
      avatarUrl: "",
      bio: "",
      role: "user",
      createdAt: serverTimestamp(),
    });
  });

  return { displayName, normalizedUsername };
}
