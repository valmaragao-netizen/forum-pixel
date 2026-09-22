"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { GoogleAuthButton } from "@/app/components/google-auth-button";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { auth } from "@/lib/firebase";
import { reserveUsername, validateUsername } from "@/lib/usernames";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    let createdUser: User | null = null;

    try {
      const validUsername = validateUsername(displayName);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = credential.user;

      await updateProfile(credential.user, {
        displayName: validUsername.displayName,
      });
      await reserveUsername(credential.user, validUsername.displayName);

      createdUser = null;
      router.push("/");
    } catch (caughtError) {
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch {
          // A mensagem original é mais útil; uma conta órfã pode ser removida
          // pelo console caso a exclusão automática também falhe.
        }
      }

      setError(getAuthErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="signup-name">NOME DE USUÁRIO</label>
        <input
          id="signup-name"
          name="displayName"
          type="text"
          autoComplete="nickname"
          minLength={2}
          maxLength={32}
          pattern="[A-Za-z0-9_]{2,32}"
          placeholder="pixel_user"
          aria-describedby="signup-name-hint"
          required
        />
        <small id="signup-name-hint" className="form-hint">
          2–32 caracteres · letras, números e underscore · único sem diferenciar maiúsculas
        </small>
      </div>

      <div className="form-field">
        <label htmlFor="signup-email">E-MAIL</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="signup-password">SENHA</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          placeholder="mínimo de 6 caracteres"
          required
        />
      </div>

      {error && <p className="auth-form-error" role="alert"><span>!</span> {error}</p>}

      <button className="publish-button auth-submit" type="submit" disabled={submitting}>
        {submitting ? "CRIANDO PERFIL..." : "CRIAR CONTA"} <span>↵</span>
      </button>

      <GoogleAuthButton label="CRIAR CONTA COM GOOGLE" disabled={submitting} />
    </form>
  );
}
