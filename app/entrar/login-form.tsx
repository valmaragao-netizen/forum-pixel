"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { GoogleAuthButton } from "@/app/components/google-auth-button";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/authErrors";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="login-email">E-MAIL</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="login-password">SENHA</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {error && <p className="auth-form-error" role="alert"><span>!</span> {error}</p>}

      <button className="publish-button auth-submit" type="submit" disabled={submitting}>
        {submitting ? "CONECTANDO..." : "ENTRAR"} <span>↵</span>
      </button>

      <GoogleAuthButton label="ENTRAR COM GOOGLE" disabled={submitting} />
    </form>
  );
}
