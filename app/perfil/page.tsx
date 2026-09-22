import type { Metadata } from "next";

import { ForumHeader } from "@/app/components/forum-header";
import { ProfileDashboard } from "@/app/perfil/profile-dashboard";

export const metadata: Metadata = {
  title: "Meu perfil | Fórum Pixel",
  description: "Gerencie seu perfil, suas publicações e sua caixa de entrada no Fórum Pixel.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <div className="forum-shell profile-page">
      <ForumHeader />
      <ProfileDashboard />
    </div>
  );
}
