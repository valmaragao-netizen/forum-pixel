"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getAuthErrorMessage } from "@/lib/authErrors";
import { authenticateWithGoogle } from "@/lib/googleAuth";

type GoogleAuthButtonProps = {
  label: string;
  disabled?: boolean;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.5c2-1.9 3.2-4.7 3.2-7.9Z" />
      <path fill="#34a853" d="M12 22c2.9 0 5.3-1 7-2.5l-3.5-2.7c-1 .7-2.2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.6v2.8A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.2 13.5a6 6 0 0 1 0-3.8V6.9H2.6a10 10 0 0 0 0 9.4l3.6-2.8Z" />
      <path fill="#ea4335" d="M12 5.7c1.6 0 3 .5 4.1 1.6l3.1-3.1A10 10 0 0 0 2.6 6.9l3.6 2.8c.8-2.4 3.1-4 5.8-4Z" />
    </svg>
  );
}

export function GoogleAuthButton({ label, disabled = false }: GoogleAuthButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleAuth() {
    setError("");
    setPending(true);

    try {
      await authenticateWithGoogle();
      router.push("/");
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="google-auth-block">
      <div className="auth-divider"><span>OU</span></div>
      <button
        className="google-auth-button"
        type="button"
        onClick={() => void handleGoogleAuth()}
        disabled={disabled || pending}
      >
        <GoogleIcon />
        <span>{pending ? "CONECTANDO AO GOOGLE..." : label}</span>
      </button>
      {error && <p className="auth-form-error" role="alert"><span>!</span> {error}</p>}
    </div>
  );
}
