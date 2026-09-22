import type { MetadataRoute } from "next";

const SITE_URL = "https://forum-pixel.vercel.app";
const DEFAULT_CATEGORY_SLUGS = [
  "tecnologia",
  "games",
  "hardware",
  "geral",
  "programacao",
  "ciencia",
  "filmes-series",
  "carreira",
];

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
};

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreQueryResult = {
  document?: FirestoreDocument;
};

export const revalidate = 3600;

function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

function stringField(document: FirestoreDocument, field: string) {
  return document.fields?.[field]?.stringValue?.trim() ?? "";
}

function timestampField(document: FirestoreDocument, field: string) {
  const value = document.fields?.[field]?.timestampValue;

  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getPublicDocuments(
  collectionId: "categories" | "topics",
  status: "active" | "published",
  selectedFields: string[],
) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error("As variáveis públicas do Firebase não estão disponíveis no servidor.");
  }

  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`,
  );
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        select: {
          fields: selectedFields.map((fieldPath) => ({ fieldPath })),
        },
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: status },
          },
        },
        limit: 49_000,
      },
    }),
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Firestore respondeu com HTTP ${response.status}.`);
  }

  const results = await response.json() as FirestoreQueryResult[];
  return results.flatMap((result) => result.document ? [result.document] : []);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
  const categorySlugs = new Set(DEFAULT_CATEGORY_SLUGS);

  const [categoriesResult, topicsResult] = await Promise.allSettled([
    getPublicDocuments("categories", "active", ["slug", "status"]),
    getPublicDocuments("topics", "published", [
      "slug",
      "status",
      "createdAt",
      "updatedAt",
    ]),
  ]);

  if (categoriesResult.status === "fulfilled") {
    for (const category of categoriesResult.value) {
      const slug = stringField(category, "slug");

      if (slug) {
        categorySlugs.add(slug);
      }
    }
  } else {
    console.error("[sitemap] Falha ao carregar categorias públicas:", categoriesResult.reason);
  }

  for (const slug of categorySlugs) {
    entries.push({
      url: absoluteUrl(`/categoria/${encodeURIComponent(slug)}`),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  if (topicsResult.status === "fulfilled") {
    for (const topic of topicsResult.value) {
      const slug = stringField(topic, "slug");

      if (!slug) {
        continue;
      }

      entries.push({
        url: absoluteUrl(`/topico/${encodeURIComponent(slug)}`),
        lastModified:
          timestampField(topic, "updatedAt") ?? timestampField(topic, "createdAt"),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } else {
    console.error("[sitemap] Falha ao carregar tópicos publicados:", topicsResult.reason);
  }

  return entries;
}
