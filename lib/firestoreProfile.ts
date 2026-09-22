import type { User } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PROFILE_AVATARS = [
  { id: "terminal-coder", label: "Terminal Coder", src: "/avatars/terminal-coder.png" },
  { id: "crt-robot", label: "CRT Robot", src: "/avatars/crt-robot.png" },
  { id: "hacker-cat", label: "Hacker Cat", src: "/avatars/hacker-cat.png" },
  { id: "cosmic-explorer", label: "Cosmic Explorer", src: "/avatars/cosmic-explorer.png" },
] as const;

type AvatarType = (typeof AVATAR_TYPES)[number];

function isAvatarType(type: string): type is AvatarType {
  return AVATAR_TYPES.includes(type as AvatarType);
}

export function validateAvatar(image: File) {
  if (!isAvatarType(image.type)) {
    throw new Error("Use uma foto JPG, PNG ou WebP.");
  }

  if (image.size > AVATAR_MAX_BYTES) {
    throw new Error("A foto deve ter no máximo 3 MB.");
  }
}

export async function updateForumProfile({
  user,
  bio,
  currentAvatarUrl,
  avatar,
  presetAvatarSrc,
}: {
  user: User;
  bio: string;
  currentAvatarUrl: string;
  avatar: File | null;
  presetAvatarSrc?: string;
}) {
  const normalizedBio = bio.trim();

  if (normalizedBio.length > 500) {
    throw new Error("A biografia deve ter no máximo 500 caracteres.");
  }

  let avatarUrl = currentAvatarUrl;

  let avatarToUpload: File | Blob | null = avatar;

  if (presetAvatarSrc) {
    const preset = PROFILE_AVATARS.find((item) => item.src === presetAvatarSrc);

    if (!preset) {
      throw new Error("O avatar selecionado não é válido.");
    }

    const response = await fetch(preset.src);

    if (!response.ok) {
      throw new Error("Não foi possível carregar o avatar selecionado.");
    }

    avatarToUpload = await response.blob();
  }

  if (avatarToUpload) {
    if (avatarToUpload instanceof File) {
      validateAvatar(avatarToUpload);
    } else if (
      !isAvatarType(avatarToUpload.type) ||
      avatarToUpload.size > AVATAR_MAX_BYTES
    ) {
      throw new Error("O avatar selecionado não possui um formato válido.");
    }

    const avatarRef = ref(storage, `avatars/${user.uid}/profile`);
    await uploadBytes(avatarRef, avatarToUpload, {
      contentType: avatarToUpload.type,
      customMetadata: { ownerId: user.uid },
    });
    avatarUrl = await getDownloadURL(avatarRef);
  }

  await updateDoc(doc(db, "users", user.uid), {
    avatarUrl,
    bio: normalizedBio,
  });

  return avatarUrl;
}

export async function deleteOwnTopic(userId: string, topicId: string) {
  await updateDoc(doc(db, "topics", topicId), {
    status: "deleted",
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    updatedAt: serverTimestamp(),
  });
}
