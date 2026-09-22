import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { withFirestoreDebug } from "@/lib/firestoreDebug";
import {
  UsernameUnavailableError,
  reserveUsername,
} from "@/lib/usernames";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function createBaseUsername(user: User) {
  const source = user.displayName || user.email?.split("@")[0] || "pixel_user";
  const normalized = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);

  return normalized.length >= 2
    ? normalized
    : `pixel_${user.uid.slice(0, 8).toLowerCase()}`;
}

function createUsernameCandidate(base: string, attempt: number) {
  if (attempt === 0) {
    return base;
  }

  const suffix = `_${attempt + 1}`;
  return `${base.slice(0, 32 - suffix.length)}${suffix}`;
}

async function ensureGoogleProfile(user: User) {
  const profileSnapshot = await withFirestoreDebug(
    "users.readGoogleProfile",
    () => getDoc(doc(db, "users", user.uid)),
    { userId: user.uid },
  );

  if (profileSnapshot.exists()) {
    const profile = profileSnapshot.data();
    const savedUsername =
      typeof profile.displayName === "string"
        ? profile.displayName
        : typeof profile.username === "string"
          ? profile.username
          : null;

    if (savedUsername && user.displayName !== savedUsername) {
      await updateProfile(user, { displayName: savedUsername });
    }

    return;
  }

  const baseUsername = createBaseUsername(user);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = createUsernameCandidate(baseUsername, attempt);

    try {
      await reserveUsername(user, candidate);
      await updateProfile(user, { displayName: candidate });
      return;
    } catch (error) {
      if (error instanceof UsernameUnavailableError) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Não foi possível gerar um nome de usuário disponível.");
}

export async function authenticateWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);

  try {
    await ensureGoogleProfile(credential.user);
    return credential.user;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}
