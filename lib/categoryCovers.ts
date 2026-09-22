const CATEGORY_COVERS: Record<string, string> = {
  tecnologia: "/covers/tecnologia.png",
  games: "/covers/games.png",
  hardware: "/covers/hardware.png",
  geral: "/covers/geral.png",
  programacao: "/covers/programacao.png",
  ciencia: "/covers/ciencia.png",
  "filmes-series": "/covers/filmes-series.png",
  carreira: "/covers/carreira.png",
};

export function getCategoryCoverUrl(categorySlug: string) {
  return CATEGORY_COVERS[categorySlug] ?? CATEGORY_COVERS.geral;
}

export async function createCategoryCoverFile(categorySlug: string) {
  const coverUrl = getCategoryCoverUrl(categorySlug);
  const response = await fetch(coverUrl);

  if (!response.ok) {
    throw new Error("Não foi possível carregar a capa padrão da categoria.");
  }

  const blob = await response.blob();
  return new File([blob], `${categorySlug}-capa.png`, { type: "image/png" });
}
