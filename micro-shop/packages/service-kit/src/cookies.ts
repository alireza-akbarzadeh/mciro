// Cookies with safe defaults. A service decides WHICH cookie (name, path,
// lifetime); the kit makes sure it's written the same careful way everywhere.

export type CookieOptions = {
  /** Scope the cookie to the service's own API path, e.g. '/api/cart'. */
  path: string;
  maxAgeSeconds?: number;
  /** Default true: no script on the page can read it. */
  httpOnly?: boolean;
  /** Default 'Lax': other sites can't make the browser send it with a POST. */
  sameSite?: 'Lax' | 'Strict';
  /** Only over HTTPS. Default: COOKIE_SECURE=true in the environment (off for local http). */
  secure?: boolean;
};

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  for (const part of (cookieHeader ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const {
    path,
    maxAgeSeconds,
    httpOnly = true,
    sameSite = 'Lax',
    secure = process.env.COOKIE_SECURE === 'true',
  } = options;
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    maxAgeSeconds === undefined ? null : `Max-Age=${maxAgeSeconds}`,
    httpOnly ? 'HttpOnly' : null,
    `SameSite=${sameSite}`,
    secure ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');
}
