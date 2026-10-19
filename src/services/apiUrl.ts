const localApiUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i;

export function resolveApiBase(configured: string, isProduction: boolean): string {
  const base = configured.trim().replace(/\/+$/, '');
  return isProduction && localApiUrl.test(base) ? '' : base;
}

export function apiUrl(path: string): string {
  return `${resolveApiBase(import.meta.env.VITE_API_URL || '', import.meta.env.PROD)}${path}`;
}
