import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { VisualTone } from "@/lib/forumData";

export type CreateCategoryInput = {
  name: string;
  slug: string;
  description: string;
  seoDescription: string;
  glyph: string;
  tone: VisualTone;
  number: string;
};

export const DEFAULT_CATEGORIES: CreateCategoryInput[] = [
  {
    name: "Tecnologia",
    slug: "tecnologia",
    description: "Software, internet, inteligência artificial, programação e o futuro digital.",
    seoDescription: "Discussões sobre tecnologia, software, internet, inteligência artificial e programação.",
    glyph: "</>",
    tone: "blue",
    number: "01",
  },
  {
    name: "Games",
    slug: "games",
    description: "Jogos, lançamentos, histórias, plataformas e cultura gamer.",
    seoDescription: "Discussões sobre games, lançamentos, plataformas, histórias e cultura gamer.",
    glyph: "+■",
    tone: "pink",
    number: "02",
  },
  {
    name: "Hardware",
    slug: "hardware",
    description: "Computadores, placas de vídeo, processadores, periféricos e tecnologia.",
    seoDescription: "Discussões sobre computadores, placas de vídeo, processadores, periféricos e hardware.",
    glyph: "▦",
    tone: "yellow",
    number: "03",
  },
  {
    name: "Geral",
    slug: "geral",
    description: "Ciência, filmes, cultura, cotidiano e tudo que merece uma boa conversa.",
    seoDescription: "Conversas sobre ciência, filmes, cultura, cotidiano e assuntos da comunidade.",
    glyph: "#_",
    tone: "cyan",
    number: "04",
  },
  {
    name: "Programação",
    slug: "programacao",
    description: "Linguagens, frameworks, arquitetura, código, ferramentas e boas práticas de desenvolvimento.",
    seoDescription: "Discussões sobre programação, linguagens, frameworks, arquitetura de software e desenvolvimento.",
    glyph: "{;}",
    tone: "blue",
    number: "05",
  },
  {
    name: "Ciência",
    slug: "ciencia",
    description: "Descobertas, espaço, física, biologia, pesquisa e curiosidades sobre o nosso universo.",
    seoDescription: "Discussões sobre ciência, espaço, física, biologia, pesquisas e descobertas científicas.",
    glyph: "⚗",
    tone: "cyan",
    number: "06",
  },
  {
    name: "Filmes & Séries",
    slug: "filmes-series",
    description: "Cinema, séries, animações, lançamentos, clássicos, teorias e recomendações da comunidade.",
    seoDescription: "Conversas sobre filmes, séries, animações, lançamentos, clássicos e cultura audiovisual.",
    glyph: "▶■",
    tone: "pink",
    number: "07",
  },
  {
    name: "Carreira",
    slug: "carreira",
    description: "Mercado de trabalho, estudos, portfólio, entrevistas e crescimento profissional em tecnologia.",
    seoDescription: "Discussões sobre carreira em tecnologia, estudos, portfólio, entrevistas e mercado de trabalho.",
    glyph: "$_",
    tone: "yellow",
    number: "08",
  },
];

export function createCategorySlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

function validateCategory(input: CreateCategoryInput) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error("O slug da categoria é inválido.");
  }

  if (input.name.trim().length < 2 || input.name.trim().length > 40) {
    throw new Error("O nome deve ter entre 2 e 40 caracteres.");
  }

  if (input.description.trim().length < 20 || input.description.trim().length > 240) {
    throw new Error("A descrição deve ter entre 20 e 240 caracteres.");
  }

  if (input.seoDescription.trim().length < 20 || input.seoDescription.trim().length > 260) {
    throw new Error("A descrição SEO deve ter entre 20 e 260 caracteres.");
  }

  if (!/^\d{2}$/.test(input.number)) {
    throw new Error("O número da categoria deve conter dois dígitos.");
  }
}

function categoryPayload(input: CreateCategoryInput, moderatorId: string) {
  return {
    slug: input.slug,
    name: input.name.trim(),
    description: input.description.trim(),
    seoDescription: input.seoDescription.trim(),
    glyph: input.glyph.trim() || "#_",
    tone: input.tone,
    number: input.number,
    status: "active",
    createdBy: moderatorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function createCategory(
  moderatorId: string,
  input: CreateCategoryInput,
) {
  validateCategory(input);
  await setDoc(doc(db, "categories", input.slug), categoryPayload(input, moderatorId));
}

export async function installDefaultCategories(moderatorId: string) {
  const existingSnapshots = await Promise.all(
    DEFAULT_CATEGORIES.map((category) => getDoc(doc(db, "categories", category.slug))),
  );
  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    if (existingSnapshots[index]?.exists()) {
      continue;
    }

    batch.set(
      doc(db, "categories", category.slug),
      categoryPayload(category, moderatorId),
    );
    pendingWrites += 1;
  }

  if (pendingWrites === 0) {
    return 0;
  }

  await batch.commit();
  return pendingWrites;
}
