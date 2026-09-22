"use client";

import Link from "next/link";

import { useAuth } from "@/app/providers/auth-provider";

export function HomeJoinCard() {
  const { user, loading } = useAuth();

  const signedIn = !loading && Boolean(user);

  return (
    <section id="criar-conta" className="join-card" aria-live="polite">
      <p className="eyebrow">{signedIn ? "PRONTO PARA PUBLICAR?" : "NOVO POR AQUI?"}</p>
      <h2>{signedIn ? "Adicione um novo debate." : "Sua próxima conversa começa aqui."}</h2>
      <p>
        {signedIn
          ? "Compartilhe uma pergunta, descoberta ou ideia com a comunidade."
          : "Crie seu perfil, encontre sua comunidade e publique sua primeira ideia."}
      </p>
      <Link className="join-button" href={signedIn ? "/novo-topico" : "/criar-conta"}>
        {signedIn ? "+ ADICIONAR DEBATE" : "+ CRIAR CONTA"}
      </Link>
      <span className="join-decoration" aria-hidden="true">▓<br />▒▓<br />░▒▓</span>
    </section>
  );
}
