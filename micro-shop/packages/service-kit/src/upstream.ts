// Calling another service. Every call has a timeout, and every failure (network,
// timeout, non-2xx, invalid JSON) becomes ONE error type, so a service can
// decide in one place how to degrade when a dependency is down.

export class UpstreamUnavailableError extends Error {
  override name = 'UpstreamUnavailableError';
}

export type FetchJsonOptions = {
  /** Default GET; POST when `body` is given. */
  method?: 'GET' | 'POST';
  /** Sent as JSON. */
  body?: unknown;
  /** Default 2 s. A slow dependency must not make every request slow. */
  timeoutMs?: number;
  /** Extra request headers, e.g. forwarding the browser's cookie to the Auth API. */
  headers?: Record<string, string>;
};

/** Calls another service and reads its JSON answer. Throws UpstreamUnavailableError on any failure. */
export async function fetchJson(
  url: string,
  { method, body, timeoutMs = 2_000, headers = {} }: FetchJsonOptions = {},
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new UpstreamUnavailableError(`${url} unavailable`, { cause: error });
  }
}
