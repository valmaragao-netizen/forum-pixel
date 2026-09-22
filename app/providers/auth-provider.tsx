"use client";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type UserRole = "user" | "moderator";

export type UserProfile = {
  uid: string;
  displayName: string;
  usernameNormalized: string;
  avatarUrl: string;
  bio: string;
  role: UserRole;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  isModerator: boolean;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfileListener: (() => void) | undefined;

    const stopAuthListener = onAuthStateChanged(auth, (currentUser) => {
      stopProfileListener?.();
      setUser(currentUser);
      setProfile(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      stopProfileListener = onSnapshot(
        doc(db, "users", currentUser.uid),
        (snapshot) => {
          if (!snapshot.exists()) {
            setProfile(null);
            setLoading(false);
            return;
          }

          const data = snapshot.data();
          setProfile({
            uid: currentUser.uid,
            displayName:
              typeof data.displayName === "string"
                ? data.displayName
                : currentUser.displayName || "usuario",
            usernameNormalized:
              typeof data.usernameNormalized === "string"
                ? data.usernameNormalized
                : "",
            avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
            bio: typeof data.bio === "string" ? data.bio : "",
            role: data.role === "moderator" ? "moderator" : "user",
          });
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        },
      );
    });

    return () => {
      stopProfileListener?.();
      stopAuthListener();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isModerator: profile?.role === "moderator",
      loading,
      logout: () => signOut(auth),
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
