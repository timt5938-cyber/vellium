export function trustedProductUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'world.openfoodfacts.org' || url.port ||
      url.username || url.password || !/^\/product\/\d{8,14}\/?$/.test(url.pathname)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
