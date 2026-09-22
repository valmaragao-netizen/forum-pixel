export function getAbsoluteUrl(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, siteUrl).toString();
}
