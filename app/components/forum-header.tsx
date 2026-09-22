"use client";

import Link from "next/link";

import { useAuth } from "@/app/providers/auth-provider";

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-eye brand-eye-left" />
      <span className="brand-eye brand-eye-right" />
      <span className="brand-mouth" />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export function ForumHeader() {
  const { user, profile, isModerator, loading, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/" aria-label="Fórum Pixel — início">
          <BrandMark />
          <span>
            <strong><i>[</i> FÓRUM <em>PIXEL</em> <i>]</i></strong>
            <small>comunidade_online.exe</small>
          </span>
        </Link>

        <form className="header-search" action="/" role="search">
          <SearchIcon />
          <label className="sr-only" htmlFor="header-search">Pesquisar no fórum</label>
          <input id="header-search" name="q" type="search" placeholder="Pesquisar no fórum..." />
          <kbd>/</kbd>
        </form>

        <nav id="login" className="top-actions" aria-label="Acesso à conta">
          {loading ? (
            <span className="auth-header-loading">VERIFICANDO...</span>
          ) : user ? (
            <>
              {isModerator && (
                <Link className="forum-button moderator-link" href="/moderacao">
                  MODERAR
                </Link>
              )}
              <Link className="account-pill" href="/perfil" title={user.email ?? undefined}>
                <b>●</b> @{profile?.displayName || user.displayName || "usuario"}
              </Link>
              <button
                className="forum-button forum-button-ghost"
                type="button"
                onClick={() => void logout()}
              >
                SAIR
              </button>
            </>
          ) : (
            <>
              <Link className="forum-button forum-button-ghost" href="/entrar">ENTRAR</Link>
              <Link className="forum-button forum-button-primary" href="/criar-conta">CRIAR CONTA</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
