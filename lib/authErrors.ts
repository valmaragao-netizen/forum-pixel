import { FirebaseError } from "firebase/app";

import {
  InvalidUsernameError,
  UsernameUnavailableError,
} from "@/lib/usernames";

const authErrorMessages: Record<string, string> = {
  "auth/account-exists-with-different-credential":
    "Já existe uma conta com este e-mail. Entre usando o método cadastrado anteriormente.",
  "auth/cancelled-popup-request": "A solicitação anterior de login foi cancelada.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um endereço de e-mail válido.",
  "auth/operation-not-allowed":
    "O login por e-mail e senha ainda não está habilitado no Firebase.",
  "auth/network-request-failed": "Falha de rede. Confira sua conexão e tente novamente.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.",
  "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o login.",
  "auth/too-many-requests":
    "Muitas tentativas foram feitas. Aguarde um pouco e tente novamente.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/unauthorized-domain":
    "Este domínio não está autorizado no Firebase Authentication.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
};

export function getAuthErrorMessage(error: unknown) {
  if (
    error instanceof UsernameUnavailableError ||
    error instanceof InvalidUsernameError
  ) {
    return error.message;
  }

  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return "O Firestore bloqueou a reserva do nome. Publique as regras de segurança do projeto e tente novamente.";
    }

    return authErrorMessages[error.code] ?? `Erro do Firebase: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}
