import Link from "next/link";

type AuthRequiredPanelProps = {
  message: string;
  detail?: string;
};

export function AuthRequiredPanel({ message, detail }: AuthRequiredPanelProps) {
  return (
    <div className="auth-required-panel">
      <span className="auth-required-prompt" aria-hidden="true">&gt;_</span>
      <div>
        <h3>&gt; {message}</h3>
        {detail && <p>{detail}</p>}
      </div>
      <div className="auth-required-actions">
        <Link className="forum-button forum-button-ghost" href="/entrar">ENTRAR</Link>
        <Link className="forum-button forum-button-primary" href="/criar-conta">CRIAR CONTA</Link>
      </div>
    </div>
  );
}
