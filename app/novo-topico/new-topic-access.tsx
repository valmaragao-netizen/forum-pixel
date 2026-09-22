"use client";

import { AuthRequiredPanel } from "@/app/components/auth-required-panel";
import { NewTopicForm } from "@/app/novo-topico/new-topic-form";
import { useAuth } from "@/app/providers/auth-provider";

export function NewTopicAccess() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-panel auth-loading-panel-large" role="status">
        <span>&gt;</span> verificando sessão<i>_</i>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="new-topic-auth-gate">
        <AuthRequiredPanel
          message="Você precisa entrar para criar um tópico."
          detail="A leitura do fórum é pública. Para publicar uma nova conversa, entre na sua conta ou crie um perfil."
        />
      </div>
    );
  }

  return <NewTopicForm />;
}
